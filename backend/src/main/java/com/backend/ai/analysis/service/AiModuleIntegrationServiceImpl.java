package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.AiAnalysisResultDTO;
import com.backend.ai.analysis.model.entity.AnalysisStatus;
import com.backend.ai.analysis.model.entity.AnalysisTarget;
import com.backend.ai.analysis.model.entity.UsAiAnalysis;
import com.backend.ai.analysis.model.entity.UsAnalysisModuleRun;
import com.backend.ai.analysis.repository.UsAiAnalysisRepository;
import com.backend.ai.analysis.repository.UsAnalysisModuleRunRepository;
import com.backend.cloud.service.CloudService;
import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.entity.UsExaminationRegion;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.LinkedHashMap;

@Service
@Slf4j
public class AiModuleIntegrationServiceImpl implements AiModuleIntegrationService {

    @Value("${api.callback.url}")
    private String callbackUrl;
    @Value("${api.url}")
    private String apiUrl;

    @Autowired
    private UsAnalysisModuleRunRepository analysisModuleRunRepository;
    @Autowired
    private UsAiAnalysisRepository aiAnalysisRepository;
    @Autowired
    private WebClient webClient;
    @Autowired
    private CloudService cloudService;
    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public AiAnalysisDTO analyze(UUID analysisUuid, AnalysisTarget target) {
        UsAiAnalysis analysis = aiAnalysisRepository.findById(analysisUuid)
            .orElseThrow();

        for (UsAnalysisModuleRun run : analysis.getModuleRuns()) {
            if (!run.getAiModule().isActive() || run.getStatus() != AnalysisStatus.PENDING) {
                continue;
            }
            SelectedVideoRequest selectedVideo = resolveSelectedVideoRequest(analysis, run);
            Map<String, Object> selectedModules = resolveSelectedModulesPayload(run, target);
            Map<String, Object> requestPayload = buildRequestPayload(selectedVideo, selectedModules);
            Map<String, Object> fastApiRequestBody = buildFastApiRequestBody(
                    selectedVideo.videoUrl,
                    selectedVideo.frameIndex,
                    selectedModules
            );
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
        log.info("[AI] Calling FastAPI endpoint: {}/analyze with payload={}", apiUrl, fastApiRequestBody);
        Map<String, Object> response = webClient.post()
                .uri(apiUrl + "/analyze")
                .bodyValue(fastApiRequestBody)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                .block();
        log.info("[AI] FastAPI response: {}", response);
        return asString(response, "job_id", "jobId", "external_job_id");
    }

    private Map<String, Object> buildRequestPayload(SelectedVideoRequest selectedVideo, Map<String, Object> selectedModules) {
        return Map.of(
                "videoUrl", selectedVideo.videoUrl,
                "frameIndex", selectedVideo.frameIndex,
                "region", selectedVideo.region.name(),
                "selected_modules", selectedModules
        );
    }

    private AiAnalysisDTO buildProcessingDto(UUID analysisUuid) {
        AiAnalysisDTO dto = new AiAnalysisDTO();
        dto.setAnalysisUuid(analysisUuid);
        dto.setAnalysisStatus(AnalysisStatus.PROCESSING);
        return dto;
    }

    private Map<String, Object> buildFastApiRequestBody(String videoUrl, int frameIndex, Map<String, Object> selectedModulesPayload) {
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

        mergeResultData(analysis, moduleRun, callbackPayLoad, callbackStatus);
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

    @SuppressWarnings("unchecked")
    private void mergeResultData(
            UsAiAnalysis analysis,
            UsAnalysisModuleRun moduleRun,
            Map<String, Object> callbackPayLoad,
            AnalysisStatus callbackStatus
    ) {
        Map<String, Object> normalizedResult = extractResultData(callbackPayLoad);
        if (normalizedResult == null) {
            normalizedResult = new LinkedHashMap<>();
        }
        normalizedResult.putIfAbsent("status", callbackStatus.name().toLowerCase(Locale.ROOT));
        String jobId = asString(callbackPayLoad, "job_id", "jobId", "external_job_id");
        if (jobId != null) {
            normalizedResult.putIfAbsent("job_id", jobId);
        }

        Map<String, Object> currentAnalysisResult = analysis.getResultData() != null
                ? new LinkedHashMap<>(analysis.getResultData())
                : new LinkedHashMap<>();

        String region = moduleRun != null ? asString(moduleRun.getRequestPayload(), "region") : null;
        if (region != null && !region.isBlank()) {
            Object existingRegions = currentAnalysisResult.get("regions");
            Map<String, Object> regionsMap;
            if (existingRegions instanceof Map<?, ?> existingMap) {
                regionsMap = new LinkedHashMap<>((Map<String, Object>) existingMap);
            } else {
                regionsMap = new LinkedHashMap<>();
            }
            regionsMap.put(region, normalizedResult);
            currentAnalysisResult.put("regions", regionsMap);
        } else {
            currentAnalysisResult.putAll(normalizedResult);
        }

        analysis.setResultData(currentAnalysisResult);
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
        if (result instanceof String s && !s.isBlank()) {
            try {
                Map<String, Object> inner = objectMapper.readValue(s, new TypeReference<>() {});
                Map<String, Object> fromInner = extractResultData(inner);
                if (fromInner != null && !fromInner.isEmpty()) {
                    return fromInner;
                }
            } catch (Exception e) {
                log.debug("[AI] Callback payload had string \"result\" but it was not JSON: {}", e.getMessage());
            }
        }
        if (result instanceof Map<?, ?> resultMap) {
            return (Map<String, Object>) resultMap;
        }
        if (payload.containsKey("b_lines") || payload.containsKey("rds_score") || payload.containsKey("error")) {
            Map<String, Object> fallback = new LinkedHashMap<>();
            if (payload.containsKey("b_lines")) {
                fallback.put("b_lines", payload.get("b_lines"));
            }
            if (payload.containsKey("rds_score")) {
                fallback.put("rds_score", payload.get("rds_score"));
            }
            if (payload.containsKey("error")) {
                fallback.put("error", payload.get("error"));
            }
            return fallback;
        }
        return null;
    }

    private SelectedVideoRequest resolveSelectedVideoRequest(UsAiAnalysis analysis, UsAnalysisModuleRun run) {
        RegionFrameSelection selected = resolveRegionAndFrameForRun(analysis, run);
        UsExaminationRegion region = selected.region();
        int frameIndex = selected.frameIndex();

        Long patientId = analysis.getPatientId();
        String examinationId = analysis.getExamId();
        String signedVideoUrl = resolveExistingVideoPath(patientId, examinationId, region);

        return new SelectedVideoRequest(region, frameIndex, signedVideoUrl);
    }

    private RegionFrameSelection resolveRegionAndFrameForRun(UsAiAnalysis analysis, UsAnalysisModuleRun run) {
        Map<String, Object> payload = run.getRequestPayload();
        if (payload != null) {
            String payloadRegion = asString(payload, "region");
            Integer payloadFrame = asInteger(payload, "frameIndex", "frame_index");

            if (payloadRegion != null && payloadFrame != null && payloadFrame >= 0) {
                try {
                    return new RegionFrameSelection(
                            UsExaminationRegion.valueOf(payloadRegion),
                            payloadFrame
                    );
                } catch (IllegalArgumentException ignored) {
                    // fall through to analysis-level lookup
                }
            }
        }

        Map<UsExaminationRegion, Integer> selectedFrames = analysis.getSelectedFrameIndices();
        if (selectedFrames == null || selectedFrames.isEmpty()) {
            throw new IllegalArgumentException("No frame index was provided for analysis " + analysis.getAnalysisUuid());
        }

        Map.Entry<UsExaminationRegion, Integer> selected = selectedFrames.entrySet()
                .stream()
                .filter(e -> e.getValue() != null && e.getValue() >= 0)
                .min(Comparator.comparing(e -> e.getKey().name()))
                .orElseThrow(() -> new IllegalArgumentException("No valid frame index found in selectedFrameIndices"));

        return new RegionFrameSelection(selected.getKey(), selected.getValue());
    }

    private Map<String, Object> resolveSelectedModulesPayload(UsAnalysisModuleRun run, AnalysisTarget fallbackTarget) {
        Map<String, Object> payload = run.getRequestPayload();
        if (payload != null) {
            Object runSelectedModules = payload.get("selected_modules");
            if (runSelectedModules instanceof Map<?, ?> selectedModulesMap) {
                Map<String, Object> selectedModules = new HashMap<>();
                Object bLines = selectedModulesMap.get("b_lines");
                Object rdsScore = selectedModulesMap.get("rds_score");
                selectedModules.put("b_lines", bLines instanceof Boolean ? bLines : false);
                selectedModules.put("rds_score", rdsScore instanceof Boolean ? rdsScore : false);
                return selectedModules;
            }
        }

        return Map.of(
                "b_lines", fallbackTarget.isB_lines(),
                "rds_score", fallbackTarget.isRds_score()
        );
    }

    private Integer asInteger(Map<String, Object> payload, String... keys) {
        String rawValue = asString(payload, keys);
        if (rawValue == null) {
            return null;
        }
        try {
            return Integer.parseInt(rawValue);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String resolveExistingVideoPath(Long patientId, String examinationId, UsExaminationRegion region) {
        List<ExaminationVideoDTO> videos = cloudService.getExaminationVideoDTO(patientId, examinationId);
        for (ExaminationVideoDTO video : videos) {
            if (video.getRegion() == region && video.getUrl() != null && !video.getUrl().isBlank()) {
                return video.getUrl();
            }
        }
        List<String> availableRegions = videos.stream()
                .map(ExaminationVideoDTO::getRegion)
                .filter(java.util.Objects::nonNull)
                .map(Enum::name)
                .toList();
        log.error("[AI] No region video found via CloudService. patientId={}, examinationId={}, region={}, availableRegions={}",
                patientId, examinationId, region.name(), availableRegions);
        throw new IllegalArgumentException("No region video found in GCS for " + region.name());
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

    private record RegionFrameSelection(UsExaminationRegion region, int frameIndex) {}
}
