package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiSuggestionRequest;
import com.backend.ai.analysis.model.entity.AnalysisStatus;
import com.backend.ai.analysis.model.entity.AnalysisTarget;
import com.backend.ai.analysis.model.entity.UsAiAnalysis;
import com.backend.ai.analysis.model.entity.UsAiModule;
import com.backend.ai.analysis.model.entity.UsAnalysisModuleRun;
import com.backend.ai.analysis.repository.UsAiAnalysisRepository;
import com.backend.ai.analysis.repository.UsAiModuleRepository;
import com.backend.ai.analysis.repository.UsAnalysisModuleRunRepository;
import com.backend.model.dto.AnalysisInitiatedDTO;
import com.backend.model.entity.UsExaminationRegion;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class AiAnalysisServiceImpl implements AiAnalysisService {
    @Autowired
    private AiModuleIntegrationService aiModuleService;
    @Autowired
    private UsAiAnalysisRepository aiAnalysisRepository;
    @Autowired
    private UsAiModuleRepository usAiModuleRepository;
    @Autowired
    private UsAnalysisModuleRunRepository analysisModuleRunRepository;

    private final String videoBaseUrl;

    public AiAnalysisServiceImpl(@Value("${video.cloud-storage.url}") String videoBaseUrl) {
        this.videoBaseUrl = videoBaseUrl;
    }

    @Override
    @Transactional
    public AnalysisInitiatedDTO startAnalysis(AiSuggestionRequest request) {
        //Get exam id
        String examId = request.getExaminationId();
        Long patientId = parsePatientId(request.getPatientId());
        Map<UsExaminationRegion, Integer> selectedFrames = request.getSelectedFrameIndices();
        if (selectedFrames == null || selectedFrames.isEmpty()) {
            throw new IllegalArgumentException("Selected frames must include at least one region");
        }

        //Create new analysis
        UsAiAnalysis aiAnalysis = new UsAiAnalysis();
        aiAnalysis.setExamId(examId);
        aiAnalysis.setPatientId(patientId);
        aiAnalysis.setStatus(AnalysisStatus.PENDING);
        aiAnalysis.setSelectedFrameIndices(request.getSelectedFrameIndices());

        aiAnalysis = aiAnalysisRepository.save(aiAnalysis);

        List<String> codes = extractRequestedModules(request.getSelectedModules());
        if (codes.isEmpty()) {
            throw new IllegalArgumentException("At least one AI module must be selected");
        }
        UsAiModule primaryModule = resolvePrimaryModule(codes);
        Map<String, Object> selectedModulesPayload = Map.of(
                "b_lines", request.getSelectedModules().isB_lines(),
                "rds_score", request.getSelectedModules().isRds_score()
        );

        for (Map.Entry<UsExaminationRegion, Integer> regionFrame : selectedFrames.entrySet()) {
            UsExaminationRegion region = regionFrame.getKey();
            Integer frameIndex = regionFrame.getValue();
            if (region == null || frameIndex == null || frameIndex < 0) {
                continue;
            }

            UsAnalysisModuleRun run = new UsAnalysisModuleRun();
            run.setAnalysis(aiAnalysis);
            run.setAiModule(primaryModule);
            //Versioning is static for now
            run.setModuleVersion("V1.0");
            run.setStatus(AnalysisStatus.PENDING);

            Map<String, Object> runPayload = new HashMap<>();
            runPayload.put("region", region.name());
            runPayload.put("frameIndex", frameIndex);
            runPayload.put("selected_modules", selectedModulesPayload);
            run.setRequestPayload(runPayload);

            analysisModuleRunRepository.save(run);
            aiAnalysis.getModuleRuns().add(run);
        }
        if (aiAnalysis.getModuleRuns().isEmpty()) {
            throw new IllegalArgumentException("No valid region/frame selections provided");
        }

        //Save analysis
        UsAiAnalysis saved = aiAnalysisRepository.save(aiAnalysis);

        UUID analysisUuid = saved.getAnalysisUuid();

        //Call python backend
        /* 
        */

        try {
            aiModuleService.analyze(analysisUuid, request.getSelectedModules());
        } catch (Exception e) {
            log.error("[AI-ENTRY] analyze failed for analysisUuid={}: {}", analysisUuid, e.getMessage(), e);
        }

        return new AnalysisInitiatedDTO(
                saved.getAnalysisUuid(),
                saved.getStatus().name()
        );
    }
    //Helper for start analysis
    private List<String> extractRequestedModules(AnalysisTarget target) {

        List<String> codes = new ArrayList<>();

        if (target.isB_lines()) {
            codes.add("B_LINE_DETECTION");
        }

        if (target.isRds_score()) {
            codes.add("RDS_SCORING");
        }

        return codes;
    }

    private UsAiModule resolvePrimaryModule(List<String> codes) {
        String primaryCode = codes.contains("B_LINE_DETECTION") ? "B_LINE_DETECTION" : codes.get(0);
        return usAiModuleRepository.findByModuleCode(primaryCode)
                .orElseThrow(() -> new IllegalArgumentException("Module not found: " + primaryCode));
    }
    public static long parsePatientId(String rawId) {
        if (rawId == null || rawId.isBlank()) {
            throw new IllegalArgumentException("Invalid patient id");
        }

        String numericPart = rawId.replaceAll("[^0-9]", "");

        if (numericPart.isEmpty()) {
            throw new IllegalArgumentException("No numeric part found in id: " + rawId);
        }

        return Long.parseLong(numericPart);
    }

    /**
     *
     * @param patientId id of the patient
     * @param examinationName examination id
     * @param region region of the examination
     * @return {cloudUrl}/ai/{patientId}/{examinationId}/{region}.png
     */
    private String getImageUrl(Long patientId,
                               String examinationName,
                               UsExaminationRegion region) {
        return this.videoBaseUrl+"/ai/"+patientId+"/"+examinationName+"/"+region.name()+".png";
    }
}
