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

        for (UsAnalysisModuleRun run : analysis.getModuleRuns()) {
            if (!run.getAiModule().isActive()) {
                continue;
            }

            Map<String, Object> fastApiRequestBody = buildFastApiRequestBody(
                    selectedVideo.videoUrl,
                    selectedVideo.frameIndex,
                    target
            );

            try {
                //Python request response
                log.info("[AI] Calling FastAPI endpoint: {}/analyze", apiUrl);
                Map<String, Object> response = webClient.post()
                                                .uri(apiUrl + "/analyze")
                                                .bodyValue(fastApiRequestBody)
                                                .retrieve()
                                                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                                                .block();

                String jobId = asString(response, "job_id", "jobId", "external_job_id");

                run.setExternalJobId(jobId);
                run.setStatus(AnalysisStatus.PROCESSING);
                run.setRequestPayload(Map.of(
                        "videoUrl", selectedVideo.videoUrl,
                        "frameIndex", selectedVideo.frameIndex,
                        "region", selectedVideo.region.name(),
                        "b_lines", target.isB_lines(),
                        "rds_score", target.isRds_score(),
                        "bounding_boxes", target.isBounding_boxes()
                ));

            }catch (WebClientResponseException e) {
                run.setStatus(AnalysisStatus.FAILED);
                log.error("[AI] FastAPI 422/HTTP error. status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            } catch (Exception e) {
                e.printStackTrace();
                run.setStatus(AnalysisStatus.FAILED);
            }
            
        }

        analysis.setStatus(AnalysisStatus.PROCESSING);
        aiAnalysisRepository.save(analysis);

        AiAnalysisDTO dto = new AiAnalysisDTO();
        dto.setAnalysisUuid(analysisUuid);
        dto.setAnalysisStatus(AnalysisStatus.PROCESSING);

        return dto;
    }

    private Map<String, Object> buildFastApiRequestBody(String videoUrl, int frameIndex, AnalysisTarget target) {
        Map<String, Object> analysisTargetPayload = new HashMap<>();
        analysisTargetPayload.put("b_lines", target.isB_lines());
        analysisTargetPayload.put("rds_score", target.isRds_score());
        analysisTargetPayload.put("bounding_boxes", target.isBounding_boxes());

        Map<String, Object> body = new HashMap<>();
        body.put("videoUrl", videoUrl);
        body.put("video_url", videoUrl);
        body.put("frameIndex", frameIndex);
        body.put("frame_index", frameIndex);
        body.put("callbackUrl", callbackUrl);
        body.put("callback_url", callbackUrl);
        body.put("analysisTarget", analysisTargetPayload);
        body.put("analysis_target", analysisTargetPayload);
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

        UsAnalysisModuleRun moduleRun = null;
        if (jobId != null && !jobId.isBlank()) {
            moduleRun = analysisModuleRunRepository.findByExternalJobId(jobId).orElse(null);
        }

         UsAiAnalysis analysis = null;
        if (moduleRun != null) {
            analysis = moduleRun.getAnalysis();
            moduleRun.setResponsePayload(callbackPayLoad);
            moduleRun.setStatus(callbackStatus);
            if (callbackStatus == AnalysisStatus.COMPLETED || callbackStatus == AnalysisStatus.FAILED) {
                moduleRun.setCompletedAt(LocalDateTime.now());
            }
        } else if (analysisUuid != null) {
            analysis = aiAnalysisRepository.findById(analysisUuid)
                    .orElseThrow(() -> new EntityNotFoundException("Analiz bulunamadı: " + analysisUuid));
        }

        if (analysis == null) {
            throw new IllegalArgumentException("Callback does not contain valid job id or analysis uuid");
        }

        Map<String, Object> resultData = extractResultData(callbackPayLoad);
        if (resultData != null && !resultData.isEmpty()) {
            analysis.setResultData(resultData);
        }

        boolean anyFailed = analysis.getModuleRuns().stream()
                .anyMatch(run -> run.getStatus() == AnalysisStatus.FAILED);
        boolean allCompleted = analysis.getModuleRuns().stream()
                .allMatch(run -> run.getStatus() == AnalysisStatus.COMPLETED);

        if (anyFailed) {
            analysis.setStatus(AnalysisStatus.FAILED);
        } else if (allCompleted) {
            analysis.setStatus(AnalysisStatus.COMPLETED);
        } else {
            analysis.setStatus(AnalysisStatus.PROCESSING);
        }

        aiAnalysisRepository.save(analysis);

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

        String patientId = analysis.getExamination().getExternalPatientId();
        String examinationId = analysis.getExamination().getExternalExaminationId();
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

    private String resolveExistingVideoPath(String patientId, String examinationId, UsExaminationRegion region) {
        String safePatient = sanitizePathPart(patientId);
        String safeExam = sanitizePathPart(examinationId);
        List<String> candidates = new ArrayList<>();
        candidates.add(String.format("ai/PT_%s/%s/%s.mp4", safePatient, safeExam, region.name()));
        candidates.add(String.format("ai/%s/%s/%s.mp4", safePatient, safeExam, region.name()));

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
