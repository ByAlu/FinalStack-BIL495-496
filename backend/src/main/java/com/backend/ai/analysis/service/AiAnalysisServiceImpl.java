package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisResultDTO;
import com.backend.ai.analysis.model.dto.DoctorSuggestionRequest;
import com.backend.ai.analysis.model.dto.UserPreprocessingSettingDTO;
import com.backend.ai.analysis.model.entity.AnalysisStatus;
import com.backend.ai.analysis.model.entity.AnalysisTarget;
import com.backend.ai.analysis.model.entity.PreprocessingOperation;
import com.backend.ai.analysis.model.entity.UsAiAnalysis;
import com.backend.ai.analysis.model.entity.UsAiModule;
import com.backend.ai.analysis.model.entity.UsAnalysisModuleRun;
import com.backend.ai.analysis.repository.PreprocessingOperationRepository;
import com.backend.ai.analysis.repository.UsAiAnalysisRepository;
import com.backend.ai.analysis.repository.UsAiModuleRepository;
import com.backend.model.entity.HealthDataType;
import com.backend.model.entity.UsExamination;
import com.backend.model.entity.UsExaminationRegion;
import com.backend.model.repository.UsExaminationRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AiAnalysisServiceImpl implements AiAnalysisService {

    private static final String MODULE_VERSION = "V1.0";

    private final AiModuleIntegrationService aiModuleService;
    private final UsAiAnalysisRepository aiAnalysisRepository;
    private final UsExaminationRepository usExaminationRepository;
    private final UsAiModuleRepository usAiModuleRepository;
    private final PreprocessingOperationRepository preprocessingOperationRepository;

    public AiAnalysisServiceImpl(
            AiModuleIntegrationService aiModuleService,
            UsAiAnalysisRepository aiAnalysisRepository,
            UsExaminationRepository usExaminationRepository,
            UsAiModuleRepository usAiModuleRepository,
            PreprocessingOperationRepository preprocessingOperationRepository
    ) {
        this.aiModuleService = aiModuleService;
        this.aiAnalysisRepository = aiAnalysisRepository;
        this.usExaminationRepository = usExaminationRepository;
        this.usAiModuleRepository = usAiModuleRepository;
        this.preprocessingOperationRepository = preprocessingOperationRepository;
    }

    @Override
    public AiAnalysisResultDTO startAnalysis(DoctorSuggestionRequest request) {
        UsExamination examination = usExaminationRepository.findByExternalExaminationId(request.getExaminationId())
                .orElseThrow(() -> new IllegalArgumentException("Examination not found: " + request.getExaminationId()));

        validatePatient(request, examination);

        List<String> requestedModuleCodes = extractRequestedModules(request.getSelectedModules());
        if (requestedModuleCodes.isEmpty()) {
            throw new IllegalArgumentException("At least one AI module must be selected.");
        }

        if (request.getSelectedFrameIndices() == null || request.getSelectedFrameIndices().isEmpty()) {
            throw new IllegalArgumentException("At least one selected frame must be provided.");
        }

        UsAiAnalysis analysis = new UsAiAnalysis();
        analysis.setExamination(examination);
        analysis.setStatus(AnalysisStatus.PENDING);
        analysis.setSelectedFrameIndices(new HashMap<>(request.getSelectedFrameIndices()));

        appendPreprocessingSettings(analysis, request.getPreprocessingSettings());
        appendModuleRuns(analysis, requestedModuleCodes, request.getSelectedFrameIndices());

        UsAiAnalysis saved = aiAnalysisRepository.saveAndFlush(analysis);

        try {
            return aiModuleService.analyze(saved.getAnalysisUuid());
        } catch (Exception e) {
            log.error("[AI-ENTRY] analyze failed for analysisUuid={}: {}", saved.getAnalysisUuid(), e.getMessage(), e);
            saved.setStatus(AnalysisStatus.FAILED);
            saved.setResultData(Map.of(
                    "error", "AI analysis could not be completed.",
                    "details", e.getMessage() == null ? "Unknown error" : e.getMessage()
            ));
            aiAnalysisRepository.save(saved);
            return aiModuleService.getAnalysis(saved.getAnalysisUuid());
        }
    }

    private String extractDigits(String id) {
        if (id == null) return "";
        return id.replaceAll("\\D", ""); // removes everything except digits
    }

    private void validatePatient(DoctorSuggestionRequest request, UsExamination examination) {
        String requestedPatientId = request.getPatientId() == null ? "" : request.getPatientId().trim();
        String examinationPatientId = examination.getExternalPatientId() == null ? "" : examination.getExternalPatientId().trim();

        // TODO: düzelt, belki de düzeltme
        requestedPatientId =  extractDigits(requestedPatientId);
        examinationPatientId = extractDigits(examinationPatientId);

        if (!requestedPatientId.isBlank() && !examinationPatientId.equalsIgnoreCase(requestedPatientId)) {
            throw new IllegalArgumentException(
                    "Examination " + request.getExaminationId() + " does not belong to patient " + requestedPatientId
            );
        }
    }

    private void appendPreprocessingSettings(
            UsAiAnalysis analysis,
            List<UserPreprocessingSettingDTO> preprocessingSettings
    ) {
        if (preprocessingSettings == null || preprocessingSettings.isEmpty()) {
            return;
        }

        for (UserPreprocessingSettingDTO settingDto : preprocessingSettings) {
            if (settingDto == null || settingDto.getOperationCode() == null || settingDto.getOperationCode().isBlank()) {
                continue;
            }

            PreprocessingOperation catalogOperation = preprocessingOperationRepository
                    .findByDataTypeAndOperationCode(HealthDataType.ULTRASOUND, settingDto.getOperationCode())
                    .orElse(null);

            Map<String, Object> setting = new LinkedHashMap<>();
            setting.put("operationCode", settingDto.getOperationCode());
            setting.put(
                    "operationName",
                    settingDto.getOperationName() != null && !settingDto.getOperationName().isBlank()
                            ? settingDto.getOperationName()
                            : catalogOperation != null
                                    ? catalogOperation.getOperationName()
                                    : settingDto.getOperationCode()
            );
            setting.put(
                    "displayOrder",
                    settingDto.getDisplayOrder() != null ? settingDto.getDisplayOrder() : analysis.getPreprocessingSettings().size() + 1
            );
            setting.put("active", settingDto.isActive());
            setting.put("parameters", settingDto.getParameters());
            analysis.getPreprocessingSettings().add(setting);
        }
    }

    private void appendModuleRuns(
            UsAiAnalysis analysis,
            List<String> requestedModuleCodes,
            Map<UsExaminationRegion, Integer> selectedFrameIndices
    ) {
        selectedFrameIndices.entrySet()
                .stream()
                .sorted(Map.Entry.comparingByKey())
                .forEach(entry -> {
                    for (String moduleCode : requestedModuleCodes) {
                        UsAiModule module = usAiModuleRepository.findByModuleCode(moduleCode)
                                .orElseThrow(() -> new IllegalArgumentException("Module not found: " + moduleCode));

                        UsAnalysisModuleRun run = new UsAnalysisModuleRun();
                        run.setAnalysis(analysis);
                        run.setAiModule(module);
                        run.setModuleVersion(MODULE_VERSION);
                        run.setStatus(AnalysisStatus.PENDING);
                        run.setRequestPayload(Map.of(
                                "region", entry.getKey().name(),
                                "frameIndex", entry.getValue(),
                                "moduleCode", moduleCode
                        ));
                        analysis.getModuleRuns().add(run);
                    }
                });
    }

    private List<String> extractRequestedModules(AnalysisTarget target) {
        List<String> codes = new ArrayList<>();

        if (target != null && target.isB_lines()) {
            codes.add("B_LINE_DETECTION");
        }

        if (target != null && target.isRds_score()) {
            codes.add("RDS_SCORING");
        }

        return codes;
    }
}
