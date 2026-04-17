package com.backend.ai.analysis.service;

import com.backend.cloud.service.CloudService;
import com.backend.ai.analysis.model.dto.AiAnalysisModuleRunDTO;
import com.backend.ai.analysis.model.dto.AiAnalysisPreprocessingSettingDTO;
import com.backend.ai.analysis.model.dto.AiAnalysisResultDTO;
import com.backend.ai.analysis.model.entity.AnalysisStatus;
import com.backend.ai.analysis.model.entity.AnalysisTarget;
import com.backend.ai.analysis.model.entity.UsAiAnalysis;
import com.backend.ai.analysis.model.entity.UsAnalysisModuleRun;
import com.backend.ai.analysis.model.entity.UsAnalysisPreprocessingSetting;
import com.backend.ai.analysis.repository.UsAiAnalysisRepository;
import com.backend.ai.analysis.repository.UsAnalysisModuleRunRepository;
import com.backend.model.entity.UsExaminationRegion;
import com.backend.model.dto.ExaminationVideoDTO;
import lombok.extern.slf4j.Slf4j;

import jakarta.persistence.EntityNotFoundException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@Slf4j
public class AiModuleIntegrationServiceImpl implements AiModuleIntegrationService {

    private static final ParameterizedTypeReference<Map<String, Object>> MAP_RESPONSE_TYPE =
            new ParameterizedTypeReference<>() {};

    private final String callbackUrl;
    private final String apiUrl;
    private final String bucketName;
    private final long pollIntervalMs;
    private final long pollTimeoutMs;
    private final UsAnalysisModuleRunRepository analysisModuleRunRepository;
    private final UsAiAnalysisRepository aiAnalysisRepository;
    private final WebClient webClient;
    private final CloudService cloudService;

    public AiModuleIntegrationServiceImpl(
            UsAnalysisModuleRunRepository analysisModuleRunRepository,
            UsAiAnalysisRepository aiAnalysisRepository,
            WebClient webClient,
            CloudService cloudService,
            @Value("${api.callback.url}") String callbackUrl,
            @Value("${api.url}") String apiUrl,
            @Value("${gcp.storage.bucket-name}") String bucketName,
            @Value("${api.poll.interval-ms:200}") long pollIntervalMs,
            @Value("${api.poll.timeout-ms:120000}") long pollTimeoutMs
    ) {
        this.analysisModuleRunRepository = analysisModuleRunRepository;
        this.aiAnalysisRepository = aiAnalysisRepository;
        this.webClient = webClient;
        this.cloudService = cloudService;
        this.callbackUrl = callbackUrl;
        this.apiUrl = apiUrl;
        this.bucketName = bucketName;
        this.pollIntervalMs = pollIntervalMs;
        this.pollTimeoutMs = pollTimeoutMs;
    }

    @Override
    @Transactional
    public AiAnalysisResultDTO analyze(UUID analysisUuid) {
        UsAiAnalysis analysis = aiAnalysisRepository.findById(analysisUuid)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found: " + analysisUuid));

        analysis.setStatus(AnalysisStatus.PROCESSING);
        aiAnalysisRepository.save(analysis);
        Map<UsExaminationRegion, String> examinationVideoUrls = loadExaminationVideoUrls(analysis);

        Map<UsExaminationRegion, List<UsAnalysisModuleRun>> runsByRegion = new LinkedHashMap<>();
        for (UsAnalysisModuleRun run : analysis.getModuleRuns()) {
            if (!run.getAiModule().isActive()) {
                continue;
            }

            runsByRegion.computeIfAbsent(resolveRegion(run), ignored -> new ArrayList<>()).add(run);
        }

        List<SubmittedRegionRun> submittedRegionRuns = new ArrayList<>();

        for (Map.Entry<UsExaminationRegion, List<UsAnalysisModuleRun>> regionEntry : runsByRegion.entrySet()) {
            SubmittedRegionRun submittedRegionRun = submitRegionRun(
                    analysis,
                    regionEntry.getKey(),
                    regionEntry.getValue(),
                    examinationVideoUrls
            );
            if (submittedRegionRun != null) {
                submittedRegionRuns.add(submittedRegionRun);
            }
        }

        if (!submittedRegionRuns.isEmpty()) {
            waitForSubmittedRegionRuns(analysis, submittedRegionRuns);
        }

        refreshAnalysisStatus(analysis);
        analysis.setResultData(buildSummaryResultData(analysis));
        aiAnalysisRepository.save(analysis);
        return toResultDto(analysis);
    }

    private Map<String, Object> buildFastApiRequestBody(String videoUrl, int frameIndex, AnalysisTarget target) {
        Map<String, Object> selectedModulesPayload = buildSelectedModulesPayload(target);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("video_url", videoUrl);
        body.put("frame_index", frameIndex);
        body.put("callback_url", callbackUrl);
        body.put("selected_modules", selectedModulesPayload);
        return body;
    }

    private SubmittedRegionRun submitRegionRun(
            UsAiAnalysis analysis,
            UsExaminationRegion region,
            List<UsAnalysisModuleRun> regionRuns,
            Map<UsExaminationRegion, String> examinationVideoUrls
    ) {
        Integer frameIndex = resolveFrameIndex(regionRuns.get(0));
        SelectedVideoRequest selectedVideo = resolveSelectedVideoRequest(
                analysis,
                region,
                frameIndex,
                examinationVideoUrls
        );
        AnalysisTarget target = buildTargetForRuns(regionRuns);
        Map<String, Object> fastApiRequestBody = buildFastApiRequestBody(
                selectedVideo.videoUrl,
                selectedVideo.frameIndex,
                target
        );

        try {
            log.info("[AI] Calling FastAPI endpoint: {}/analyze for analysisUuid={} region={} modules={}",
                    apiUrl,
                    analysis.getAnalysisUuid(),
                    region.name(),
                    regionRuns.stream().map(run -> run.getAiModule().getModuleCode()).toList());
            Map<String, Object> response = webClient.post()
                    .uri(apiUrl + "/analyze")
                    .bodyValue(fastApiRequestBody)
                    .retrieve()
                    .bodyToMono(MAP_RESPONSE_TYPE)
                    .block();

            String jobId = asString(response, "job_id", "jobId", "external_job_id");
            if (jobId == null || jobId.isBlank()) {
                throw new IllegalStateException("AI module did not return a job id.");
            }

            Map<String, Object> selectedModulesPayload = buildSelectedModulesPayload(target);

            for (UsAnalysisModuleRun run : regionRuns) {
                Map<String, Object> requestPayload = new LinkedHashMap<>();
                requestPayload.put("analysisUuid", analysis.getAnalysisUuid().toString());
                requestPayload.put("region", selectedVideo.region.name());
                requestPayload.put("frameIndex", selectedVideo.frameIndex);
                requestPayload.put("videoUrl", selectedVideo.videoUrl);
                requestPayload.put("moduleCode", run.getAiModule().getModuleCode());
                requestPayload.put("selected_modules", selectedModulesPayload);
                requestPayload.put("analysis_target", selectedModulesPayload);

                run.setExternalJobId(jobId);
                run.setStatus(AnalysisStatus.PROCESSING);
                run.setRequestPayload(requestPayload);
                analysisModuleRunRepository.save(run);
            }
            return new SubmittedRegionRun(region, regionRuns, jobId);
        } catch (WebClientResponseException e) {
            log.error("[AI] FastAPI request failed. status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            for (UsAnalysisModuleRun run : regionRuns) {
                markRunFailed(analysis, run, "AI module request failed: " + e.getMessage(), Map.of(
                        "status", "failed",
                        "error", e.getResponseBodyAsString()
                ));
            }
        } catch (Exception e) {
            log.error("[AI] Module execution failed for analysisUuid={} region={}: {}",
                    analysis.getAnalysisUuid(), region.name(), e.getMessage(), e);
            for (UsAnalysisModuleRun run : regionRuns) {
                markRunFailed(analysis, run, e.getMessage(), Map.of(
                        "status", "failed",
                        "error", e.getMessage()
                ));
            }
        }
        return null;
    }

    private void waitForSubmittedRegionRuns(UsAiAnalysis analysis, List<SubmittedRegionRun> submittedRegionRuns) {
        long startedAt = System.currentTimeMillis();
        List<SubmittedRegionRun> pendingRuns = new ArrayList<>(submittedRegionRuns);

        while (!pendingRuns.isEmpty() && System.currentTimeMillis() - startedAt <= pollTimeoutMs) {
            List<SubmittedRegionRun> completedRuns = new ArrayList<>();

            for (SubmittedRegionRun submittedRegionRun : pendingRuns) {
                Map<String, Object> jobResponse = webClient.get()
                        .uri(apiUrl + "/jobs/{jobId}", submittedRegionRun.jobId)
                        .retrieve()
                        .bodyToMono(MAP_RESPONSE_TYPE)
                        .block();

                AnalysisStatus status = parseStatus(asString(jobResponse, "status"));
                if (status == AnalysisStatus.COMPLETED || status == AnalysisStatus.FAILED) {
                    Map<String, Object> normalizedResultPayload = normalizeAiResultPayload(jobResponse);
                    for (UsAnalysisModuleRun run : submittedRegionRun.regionRuns) {
                        applyRunResponse(analysis, run, jobResponse, normalizedResultPayload);
                    }
                    completedRuns.add(submittedRegionRun);
                }
            }

            pendingRuns.removeAll(completedRuns);

            if (pendingRuns.isEmpty()) {
                return;
            }

            try {
                Thread.sleep(pollIntervalMs);
            } catch (InterruptedException interruptedException) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("AI job polling interrupted.", interruptedException);
            }
        }

        throw new IllegalStateException("Timed out waiting for AI jobs to complete");
    }

    private void applyRunResponse(
            UsAiAnalysis analysis,
            UsAnalysisModuleRun run,
            Map<String, Object> responsePayload,
            Map<String, Object> normalizedResultPayload
    ) {
        AnalysisStatus callbackStatus = parseStatus(asString(responsePayload, "status"));
        run.setResponsePayload(responsePayload);
        run.setStatus(callbackStatus);
        if (callbackStatus == AnalysisStatus.COMPLETED || callbackStatus == AnalysisStatus.FAILED) {
            run.setCompletedAt(LocalDateTime.now());
        }

        if (normalizedResultPayload != null && !normalizedResultPayload.isEmpty()) {
            mergeRunResult(analysis, run, normalizedResultPayload);
        }

        analysisModuleRunRepository.save(run);
        refreshAnalysisStatus(analysis);
        analysis.setResultData(buildSummaryResultData(analysis));
        aiAnalysisRepository.save(analysis);
    }

    private void markRunFailed(
            UsAiAnalysis analysis,
            UsAnalysisModuleRun run,
            String errorMessage,
            Map<String, Object> responsePayload
    ) {
        run.setResponsePayload(new LinkedHashMap<>(responsePayload));
        run.setStatus(AnalysisStatus.FAILED);
        run.setCompletedAt(LocalDateTime.now());
        analysisModuleRunRepository.save(run);

        mergeRunResult(analysis, run, Map.of(
                "status", "failed",
                "error", errorMessage == null ? "Unknown error" : errorMessage
        ));
        refreshAnalysisStatus(analysis);
        analysis.setResultData(buildSummaryResultData(analysis));
        aiAnalysisRepository.save(analysis);
    }

    private Map<String, Object> buildSelectedModulesPayload(AnalysisTarget target) {
        Map<String, Object> selectedModulesPayload = new LinkedHashMap<>();
        selectedModulesPayload.put("b_lines", target.isB_lines());
        selectedModulesPayload.put("rds_score", target.isRds_score());
        return selectedModulesPayload;
    }

    private AnalysisTarget buildTargetForRuns(List<UsAnalysisModuleRun> regionRuns) {
        AnalysisTarget target = new AnalysisTarget();

        for (UsAnalysisModuleRun run : regionRuns) {
            String moduleCode = run.getAiModule().getModuleCode();
            if ("B_LINE_DETECTION".equals(moduleCode)) {
                target.setB_lines(true);
            }
            if ("RDS_SCORING".equals(moduleCode)) {
                target.setRds_score(true);
            }
        }

        return target;
    }

    private void mergeRunResult(UsAiAnalysis analysis, UsAnalysisModuleRun run, Map<String, Object> normalizedResultPayload) {
        Map<String, Object> currentResultData = analysis.getResultData() == null
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(analysis.getResultData());
        Map<String, Object> regions = getNestedMap(currentResultData, "regions");
        String regionKey = resolveRegion(run).name();
        Map<String, Object> regionData = getNestedMap(regions, regionKey);

        regionData.put("region", regionKey);
        regionData.put("frame_index", resolveFrameIndex(run));

        if ("B_LINE_DETECTION".equals(run.getAiModule().getModuleCode())) {
            Object bLines = normalizedResultPayload.get("b_lines");
            if (bLines instanceof Map<?, ?> bLineResult) {
                regionData.put("b_line_module", new LinkedHashMap<>((Map<String, Object>) bLineResult));
            }
        }

        if ("RDS_SCORING".equals(run.getAiModule().getModuleCode()) && normalizedResultPayload.get("rds_score") != null) {
            regionData.put("rds_score_module", Map.of("score", normalizedResultPayload.get("rds_score")));
        }

        if (normalizedResultPayload.get("error") != null) {
            Map<String, Object> moduleErrors = getNestedMap(regionData, "module_errors");
            moduleErrors.put(toFrontendModuleId(run.getAiModule().getModuleCode()), normalizedResultPayload.get("error"));
        }

        analysis.setResultData(currentResultData);
    }

    private Map<String, Object> buildSummaryResultData(UsAiAnalysis analysis) {
        Map<String, Object> resultData = analysis.getResultData() == null
                ? new LinkedHashMap<>()
                : new LinkedHashMap<>(analysis.getResultData());
        Map<String, Object> regions = getNestedMap(resultData, "regions");

        int totalRdsScore = regions.values().stream()
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .map(regionData -> regionData.get("rds_score_module"))
                .filter(Map.class::isInstance)
                .map(Map.class::cast)
                .map(moduleData -> moduleData.get("score"))
                .filter(Number.class::isInstance)
                .mapToInt(value -> ((Number) value).intValue())
                .sum();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("selected_regions", analysis.getSelectedFrameIndices().keySet().stream().map(Enum::name).sorted().toList());
        summary.put("total_module_runs", analysis.getModuleRuns().size());
        summary.put("completed_module_runs", analysis.getModuleRuns().stream().filter(run -> run.getStatus() == AnalysisStatus.COMPLETED).count());
        summary.put("failed_module_runs", analysis.getModuleRuns().stream().filter(run -> run.getStatus() == AnalysisStatus.FAILED).count());
        summary.put("total_rds_score", totalRdsScore);
        resultData.put("summary", summary);
        return resultData;
    }

    private void refreshAnalysisStatus(UsAiAnalysis analysis) {
        boolean anyFailed = analysis.getModuleRuns().stream().anyMatch(run -> run.getStatus() == AnalysisStatus.FAILED);
        boolean allCompleted = !analysis.getModuleRuns().isEmpty()
                && analysis.getModuleRuns().stream().allMatch(run -> run.getStatus() == AnalysisStatus.COMPLETED);

        if (anyFailed) {
            analysis.setStatus(AnalysisStatus.FAILED);
        } else if (allCompleted) {
            analysis.setStatus(AnalysisStatus.COMPLETED);
        } else {
            analysis.setStatus(AnalysisStatus.PROCESSING);
        }
    }

    private AiAnalysisResultDTO toResultDto(UsAiAnalysis entity) {
        return new AiAnalysisResultDTO(
                entity.getAnalysisUuid(),
                entity.getExamination().getExternalPatientId(),
                entity.getExamination().getExternalExaminationId(),
                entity.getStatus(),
                entity.getSelectedFrameIndices(),
                entity.getPreprocessingSettings().stream()
                        .sorted(Comparator.comparing(UsAnalysisPreprocessingSetting::getDisplayOrder))
                        .map(this::toPreprocessingSettingDto)
                        .toList(),
                entity.getModuleRuns().stream()
                        .sorted(Comparator.comparing(this::resolveRegion).thenComparing(run -> run.getAiModule().getDisplayName()))
                        .map(this::toModuleRunDto)
                        .toList(),
                entity.getResultData()
        );
    }

    private AiAnalysisPreprocessingSettingDTO toPreprocessingSettingDto(UsAnalysisPreprocessingSetting setting) {
        return new AiAnalysisPreprocessingSettingDTO(
                setting.getOperationName(),
                setting.getOperationCode(),
                setting.getDisplayOrder(),
                setting.isActive(),
                setting.getParameters()
        );
    }

    private AiAnalysisModuleRunDTO toModuleRunDto(UsAnalysisModuleRun run) {
        return new AiAnalysisModuleRunDTO(
                run.getId(),
                run.getExternalJobId(),
                run.getAiModule().getModuleCode(),
                toFrontendModuleId(run.getAiModule().getModuleCode()),
                run.getAiModule().getDisplayName(),
                resolveRegion(run).name(),
                resolveFrameIndex(run),
                run.getStatus(),
                run.getRequestedAt(),
                run.getCompletedAt(),
                run.getRequestPayload(),
                run.getResponsePayload(),
                normalizeAiResultPayload(run.getResponsePayload())
        );
    }

    private String toFrontendModuleId(String moduleCode) {
        return switch (moduleCode) {
            case "B_LINE_DETECTION" -> "b-line";
            case "RDS_SCORING" -> "rds-score";
            default -> moduleCode.toLowerCase(Locale.ROOT).replace('_', '-');
        };
    }

    @Deprecated
    @Transactional(readOnly = true)
    private AiAnalysisResultDTO legacyGetAnalysis(UUID analysisUuid) {
        UsAiAnalysis entity = aiAnalysisRepository.findById(analysisUuid)
                .orElseThrow(() -> new EntityNotFoundException("Analiz bulunamadı: " + analysisUuid));
        return toResultDto(entity);
    }

    @Deprecated
    @Transactional
    private void legacyProcessCallBack(Map<String,Object> callbackPayLoad){

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

    @Override
    @Transactional(readOnly = true)
    public AiAnalysisResultDTO getAnalysis(UUID analysisUuid) {
        UsAiAnalysis entity = aiAnalysisRepository.findById(analysisUuid)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found: " + analysisUuid));
        return toResultDto(entity);
    }

    @Override
    @Transactional
    public void processCallBack(Map<String, Object> callbackPayLoad) {
        String jobId = asString(callbackPayLoad, "job_id", "jobId", "external_job_id");
        if (jobId == null || jobId.isBlank()) {
            throw new IllegalArgumentException("Callback does not contain a valid job id");
        }

        UsAnalysisModuleRun moduleRun = analysisModuleRunRepository.findByExternalJobId(jobId)
                .orElseThrow(() -> new EntityNotFoundException("Module run not found for job id: " + jobId));

        applyRunResponse(
                moduleRun.getAnalysis(),
                moduleRun,
                callbackPayLoad,
                normalizeAiResultPayload(callbackPayLoad)
        );
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

    private Map<String, Object> extractResultData(Map<String, Object> payload) {
        return normalizeAiResultPayload(payload);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> normalizeAiResultPayload(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return null;
        }
        Object directResult = payload.get("resultData");
        if (directResult instanceof Map<?, ?> resultMap) {
            return new LinkedHashMap<>((Map<String, Object>) resultMap);
        }
        Object snakeCaseResult = payload.get("result_data");
        if (snakeCaseResult instanceof Map<?, ?> resultMap) {
            return new LinkedHashMap<>((Map<String, Object>) resultMap);
        }
        Object result = payload.get("result");
        if (result instanceof Map<?, ?> resultMap) {
            return new LinkedHashMap<>((Map<String, Object>) resultMap);
        }
        if (payload.containsKey("b_lines") || payload.containsKey("rds_score") || payload.containsKey("error")) {
            return new LinkedHashMap<>(payload);
        }
        return null;
    }

    private UsExaminationRegion resolveRegion(UsAnalysisModuleRun run) {
        if (run.getRequestPayload() != null) {
            String regionValue = asString(run.getRequestPayload(), "region");
            if (regionValue != null) {
                return UsExaminationRegion.valueOf(regionValue.trim().toUpperCase(Locale.ROOT));
            }
        }

        return run.getAnalysis().getSelectedFrameIndices().keySet().stream()
                .sorted()
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No region selected for analysis " + run.getAnalysis().getAnalysisUuid()));
    }

    private Integer resolveFrameIndex(UsAnalysisModuleRun run) {
        if (run.getRequestPayload() != null) {
            Object frameIndex = run.getRequestPayload().get("frameIndex");
            if (frameIndex instanceof Number number) {
                return number.intValue();
            }
        }

        Integer selectedFrameIndex = run.getAnalysis().getSelectedFrameIndices().get(resolveRegion(run));
        if (selectedFrameIndex == null) {
            throw new IllegalArgumentException("No frame index selected for region " + resolveRegion(run).name());
        }
        return selectedFrameIndex;
    }

    private SelectedVideoRequest resolveSelectedVideoRequest(
            UsAiAnalysis analysis,
            UsExaminationRegion region,
            Integer frameIndex,
            Map<UsExaminationRegion, String> examinationVideoUrls
    ) {
        int resolvedFrameIndex = frameIndex != null
                ? frameIndex
                : Objects.requireNonNullElse(analysis.getSelectedFrameIndices().get(region), -1);
        if (resolvedFrameIndex < 0) {
            throw new IllegalArgumentException("No valid frame index found in selectedFrameIndices for " + region.name());
        }

        String signedVideoUrl = examinationVideoUrls.get(region);
        if (signedVideoUrl != null && !signedVideoUrl.isBlank()) {
            return new SelectedVideoRequest(region, resolvedFrameIndex, signedVideoUrl);
        }

        Long numericPatientId = extractNumericPatientId(analysis.getExamination().getExternalPatientId());
        String examinationId = analysis.getExamination().getExternalExaminationId();
        throw new IllegalArgumentException(
                "No signed examination video URL found for patient " + numericPatientId
                        + ", examination " + examinationId
                        + ", region " + region.name()
        );
    }

    // fetch all urls at once 
    private Map<UsExaminationRegion, String> loadExaminationVideoUrls(UsAiAnalysis analysis) {
        Long numericPatientId = extractNumericPatientId(analysis.getExamination().getExternalPatientId());
        String examinationId = analysis.getExamination().getExternalExaminationId();

        List<ExaminationVideoDTO> examinationVideos = cloudService.getExaminationVideoDTO(numericPatientId, examinationId);
        Map<UsExaminationRegion, String> examinationVideoUrls = new LinkedHashMap<>();

        for (ExaminationVideoDTO examinationVideo : examinationVideos) {
            if (examinationVideo.getRegion() == null) {
                continue;
            }

            String signedUrl = examinationVideo.getUrl();
            if (signedUrl == null || signedUrl.isBlank()) {
                continue;
            }

            examinationVideoUrls.put(examinationVideo.getRegion(), signedUrl);
        }

        return examinationVideoUrls;
    }

    private Long extractNumericPatientId(String patientId) {
        String digits = Objects.requireNonNullElse(patientId, "").replaceAll("\\D", "");
        if (digits.isBlank()) {
            throw new IllegalArgumentException("Patient id does not contain a numeric value: " + patientId);
        }
        return Long.valueOf(digits);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getNestedMap(Map<String, Object> parent, String key) {
        Object existingValue = parent.get(key);
        if (existingValue instanceof Map<?, ?> existingMap) {
            return (Map<String, Object>) existingMap;
        }

        Map<String, Object> created = new LinkedHashMap<>();
        parent.put(key, created);
        return created;
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

    private static final class SubmittedRegionRun {
        private final UsExaminationRegion region;
        private final List<UsAnalysisModuleRun> regionRuns;
        private final String jobId;

        private SubmittedRegionRun(UsExaminationRegion region, List<UsAnalysisModuleRun> regionRuns, String jobId) {
            this.region = region;
            this.regionRuns = regionRuns;
            this.jobId = jobId;
        }
    }
}
