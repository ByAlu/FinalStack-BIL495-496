package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.AiAnalysisResultDTO;
import com.backend.ai.analysis.model.entity.AnalysisStatus;
import com.backend.ai.analysis.model.entity.AnalysisTarget;
import com.backend.ai.analysis.model.entity.UsAiAnalysis;
import com.backend.ai.analysis.model.entity.UsAnalysisModuleRun;
import com.backend.ai.analysis.repository.UsAiAnalysisRepository;
import com.backend.ai.analysis.repository.UsAnalysisModuleRunRepository;
import com.backend.model.entity.UsExaminationRegion;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.HttpMethod;
import com.google.cloud.storage.Storage;
import lombok.extern.slf4j.Slf4j;

import jakarta.persistence.EntityNotFoundException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;
import java.util.Map;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;

@Service
@Slf4j
public class AiModuleIntegrationServiceImpl implements AiModuleIntegrationService {

    @Value("${api.callback.url}")
    private String callbackUrl;
    @Value("${api.url}")
    private String apiUrl;
    @Value("${gcp.storage.bucket-name}")
    private String bucketName;

    @Autowired
    private UsAnalysisModuleRunRepository analysisModuleRunRepository;
    @Autowired
    private UsAiAnalysisRepository aiAnalysisRepository;
    @Autowired
    private WebClient webClient;
    @Autowired
    private Storage storage;

    @Override
    public AiAnalysisDTO analyze(UUID analysisUuid, AnalysisTarget target) {
        UsAiAnalysis analysis = aiAnalysisRepository.findById(analysisUuid)
            .orElseThrow();

        SelectedVideoRequest selectedVideo = resolveSelectedVideoRequest(analysis);
        Map<String, Object> requestPayload = buildRequestPayload(selectedVideo, target);
        Map<String, Object> fastApiRequestBody = buildFastApiRequestBody(
                selectedVideo.videoUrl,
                selectedVideo.frameIndex,
                target
        );

        for (UsAnalysisModuleRun run : analysis.getModuleRuns()) {
            if (!run.getAiModule().isActive()) {
                continue;
            }
            triggerModuleRun(run, fastApiRequestBody, requestPayload);
        }

        analysis.setStatus(AnalysisStatus.PROCESSING);
        aiAnalysisRepository.save(analysis);

        return buildProcessingDto(analysisUuid);
    }

    private void triggerModuleRun(
            UsAnalysisModuleRun run,
            Map<String, Object> fastApiRequestBody,
            Map<String, Object> requestPayload
    ) {
        try {
            String jobId = callAnalyzeApi(fastApiRequestBody);
            run.setExternalJobId(jobId);
            run.setStatus(AnalysisStatus.PROCESSING);
            run.setRequestPayload(requestPayload);
        } catch (WebClientResponseException e) {
            run.setStatus(AnalysisStatus.FAILED);
            log.error("[AI] FastAPI 422/HTTP error. status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
        } catch (Exception e) {
            run.setStatus(AnalysisStatus.FAILED);
            log.error("[AI] Failed to trigger module run", e);
        }
    }

    private String callAnalyzeApi(Map<String, Object> fastApiRequestBody) {
        log.info("[AI] Calling FastAPI endpoint: {}/analyze", apiUrl);
        Map<String, Object> response = webClient.post()
                .uri(apiUrl + "/analyze")
                .bodyValue(fastApiRequestBody)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();
        return asString(response, "job_id", "jobId", "external_job_id");
    }

    private Map<String, Object> buildRequestPayload(SelectedVideoRequest selectedVideo, AnalysisTarget target) {
        return Map.of(
                "videoUrl", selectedVideo.videoUrl,
                "frameIndex", selectedVideo.frameIndex,
                "region", selectedVideo.region.name(),
                "selected_modules", Map.of(
                        "b_lines", target.isB_lines(),
                        "rds_score", target.isRds_score()
                )
        );
    }

    private AiAnalysisDTO buildProcessingDto(UUID analysisUuid) {
        AiAnalysisDTO dto = new AiAnalysisDTO();
        dto.setAnalysisUuid(analysisUuid);
        dto.setAnalysisStatus(AnalysisStatus.PROCESSING);
        return dto;
    }

    private Map<String, Object> buildFastApiRequestBody(String videoUrl, int frameIndex, AnalysisTarget target) {
        Map<String, Object> selectedModulesPayload = new HashMap<>();
        selectedModulesPayload.put("b_lines", target.isB_lines());
        selectedModulesPayload.put("rds_score", target.isRds_score());

        Map<String, Object> body = new HashMap<>();
        body.put("video_url", videoUrl);
        body.put("frame_index", frameIndex);
        body.put("callback_url", callbackUrl);
        body.put("selected_modules", selectedModulesPayload);
        return body;
    }

    @Override
    public AiAnalysisResultDTO getAnalysis(UUID analysisUuid) {
        UsAiAnalysis entity = aiAnalysisRepository.findById(analysisUuid)
                .orElseThrow(() -> new EntityNotFoundException("Analiz bulunamadı: " + analysisUuid));
        AiAnalysisResultDTO dto = new AiAnalysisResultDTO();
        dto.setAnalysisUuid(entity.getAnalysisUuid());
        dto.setStatus(entity.getStatus());

        if (entity.getStatus() == AnalysisStatus.COMPLETED) {
            dto.setResultData(entity.getResultData());
        }

        return dto;
    }

    @Override
    @Transactional
    public void processCallBack(Map<String,Object> callbackPayLoad){
        String jobId = asString(callbackPayLoad, "job_id", "jobId", "external_job_id");
        UUID analysisUuid = asUuid(callbackPayLoad, "analysis_uuid", "analysisUuid");
        AnalysisStatus callbackStatus = parseStatus(asString(callbackPayLoad, "status"));

        UsAnalysisModuleRun moduleRun = findModuleRun(jobId);
        UsAiAnalysis analysis = resolveAnalysis(moduleRun, analysisUuid);

        if (moduleRun != null) {
            updateModuleRunFromCallback(moduleRun, callbackPayLoad, callbackStatus);
        }

        mergeResultData(analysis, callbackPayLoad);
        analysis.setStatus(calculateAnalysisStatus(analysis));
        aiAnalysisRepository.save(analysis);
    }

    private UsAnalysisModuleRun findModuleRun(String jobId) {
        if (jobId == null || jobId.isBlank()) {
            return null;
        }
        return analysisModuleRunRepository.findByExternalJobId(jobId).orElse(null);
    }

    private UsAiAnalysis resolveAnalysis(UsAnalysisModuleRun moduleRun, UUID analysisUuid) {
        if (moduleRun != null) {
            return moduleRun.getAnalysis();
        }
        if (analysisUuid != null) {
            return aiAnalysisRepository.findById(analysisUuid)
                    .orElseThrow(() -> new EntityNotFoundException("Analiz bulunamadı: " + analysisUuid));
        }
        throw new IllegalArgumentException("Callback does not contain valid job id or analysis uuid");
    }

    private void updateModuleRunFromCallback(
            UsAnalysisModuleRun moduleRun,
            Map<String, Object> callbackPayLoad,
            AnalysisStatus callbackStatus
    ) {
        moduleRun.setResponsePayload(callbackPayLoad);
        moduleRun.setStatus(callbackStatus);
        if (callbackStatus == AnalysisStatus.COMPLETED || callbackStatus == AnalysisStatus.FAILED) {
            moduleRun.setCompletedAt(LocalDateTime.now());
        }
    }

    private void mergeResultData(UsAiAnalysis analysis, Map<String, Object> callbackPayLoad) {
        Map<String, Object> resultData = extractResultData(callbackPayLoad);
        if (resultData != null && !resultData.isEmpty()) {
            analysis.setResultData(resultData);
        }
    }

    private AnalysisStatus calculateAnalysisStatus(UsAiAnalysis analysis) {
        boolean anyFailed = analysis.getModuleRuns().stream()
                .anyMatch(run -> run.getStatus() == AnalysisStatus.FAILED);
        if (anyFailed) {
            return AnalysisStatus.FAILED;
        }

        boolean allCompleted = analysis.getModuleRuns().stream()
                .allMatch(run -> run.getStatus() == AnalysisStatus.COMPLETED);
        if (allCompleted) {
            return AnalysisStatus.COMPLETED;
        }
        return AnalysisStatus.PROCESSING;
    }

    private String asString(Map<String, Object> payload, String... keys) {
        if (payload == null) {
            return null;
        }
        for (String key : keys) {
            Object value = payload.get(key);
            if (value != null) {
                String stringValue = String.valueOf(value).trim();
                if (!stringValue.isEmpty()) {
                    return stringValue;
                }
            }
        }
        return null;
    }

    private UUID asUuid(Map<String, Object> payload, String... keys) {
        String value = asString(payload, keys);
        if (value == null) {
            return null;
        }
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private AnalysisStatus parseStatus(String statusValue) {
        if (statusValue == null || statusValue.isBlank()) {
            return AnalysisStatus.COMPLETED;
        }
        try {
            return AnalysisStatus.valueOf(statusValue.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return AnalysisStatus.COMPLETED;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> extractResultData(Map<String, Object> payload) {
        if (payload == null) {
            return null;
        }
        Object directResult = payload.get("resultData");
        if (directResult instanceof Map<?, ?> resultMap) {
            return (Map<String, Object>) resultMap;
        }
        Object snakeCaseResult = payload.get("result_data");
        if (snakeCaseResult instanceof Map<?, ?> resultMap) {
            return (Map<String, Object>) resultMap;
        }
        Object result = payload.get("result");
        if (result instanceof Map<?, ?> resultMap) {
            return (Map<String, Object>) resultMap;
        }
        return null;
    }

    private SelectedVideoRequest resolveSelectedVideoRequest(UsAiAnalysis analysis) {
        Map<UsExaminationRegion, Integer> selectedFrames = analysis.getSelectedFrameIndices();
        if (selectedFrames == null || selectedFrames.isEmpty()) {
            throw new IllegalArgumentException("No frame index was provided for analysis " + analysis.getAnalysisUuid());
        }

        Map.Entry<UsExaminationRegion, Integer> selected = selectedFrames.entrySet()
                .stream()
                .filter(e -> e.getValue() != null && e.getValue() >= 0)
                .min(Comparator.comparing(e -> e.getKey().name()))
                .orElseThrow(() -> new IllegalArgumentException("No valid frame index found in selectedFrameIndices"));

        UsExaminationRegion region = selected.getKey();
        int frameIndex = selected.getValue();

        Long patientId = analysis.getPatientId();
        String examinationId = analysis.getExamId();
        String videoPath = resolveExistingVideoPath(patientId, examinationId, region);

        Blob videoBlob = storage.get(BlobId.of(bucketName, videoPath));
        if (videoBlob == null) {
            throw new IllegalArgumentException("Video blob not found for path: " + videoPath);
        }

        String signedVideoUrl = storage.signUrl(
                videoBlob,
                60,
                java.util.concurrent.TimeUnit.MINUTES,
                Storage.SignUrlOption.httpMethod(HttpMethod.GET),
                Storage.SignUrlOption.withV4Signature()
        ).toString();

        return new SelectedVideoRequest(region, frameIndex, signedVideoUrl);
    }

    private String resolveExistingVideoPath(Long patientId, String examinationId, UsExaminationRegion region) {
        String safeExam = sanitizePathPart(examinationId);
        List<String> candidates = new ArrayList<>();
        candidates.add(String.format("ai/PT_%s/%s/%s.mp4", patientId, safeExam, region.name()));
        candidates.add(String.format("ai/%s/%s/%s.mp4", patientId, safeExam, region.name()));

        for (String path : candidates) {
            if (storage.get(BlobId.of(bucketName, path)) != null) {
                return path;
            }
        }
        throw new IllegalArgumentException("No region video found in GCS for " + region.name());
    }

    private String sanitizePathPart(String value) {
        return Objects.requireNonNullElse(value, "unknown").replaceAll("[^a-zA-Z0-9_\\-]", "_");
    }

    private static final class SelectedVideoRequest {
        private final UsExaminationRegion region;
        private final int frameIndex;
        private final String videoUrl;

        private SelectedVideoRequest(UsExaminationRegion region, int frameIndex, String videoUrl) {
            this.region = region;
            this.frameIndex = frameIndex;
            this.videoUrl = videoUrl;
        }
    }
}
