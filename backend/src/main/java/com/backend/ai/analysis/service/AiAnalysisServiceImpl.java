package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.DoctorSuggestionRequest;
import com.backend.ai.analysis.model.entity.AnalysisStatus;
import com.backend.ai.analysis.model.entity.AnalysisTarget;
import com.backend.ai.analysis.model.entity.UsAiAnalysis;
import com.backend.ai.analysis.model.entity.UsAiModule;
import com.backend.ai.analysis.model.entity.UsAnalysisModuleRun;
import com.backend.ai.analysis.repository.UsAiAnalysisRepository;
import com.backend.ai.analysis.repository.UsAiModuleRepository;
import com.backend.ai.analysis.repository.UsAnalysisModuleRunRepository;
import com.backend.model.dto.AnalysisInitiatedDTO;
import com.backend.model.entity.UsExamination;
import com.backend.model.entity.UsExaminationRegion;
import com.backend.model.repository.UsExaminationRepository;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
@Slf4j
public class AiAnalysisServiceImpl implements AiAnalysisService {
    @Autowired
    private AiModuleIntegrationService aiModuleService;
    @Autowired
    private UsAiAnalysisRepository aiAnalysisRepository;
    @Autowired
    private UsExaminationRepository usExaminationRepository;
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
    public AnalysisInitiatedDTO startAnalysis(DoctorSuggestionRequest request) {
        //Find exam and set to object
        UsExamination examination = usExaminationRepository.findByExternalExaminationId(request.getExaminationId())
                .orElseThrow(() -> new IllegalArgumentException("Examination not found: " + request.getExaminationId()));

        //Create new analysis
        UsAiAnalysis aiAnalysis = new UsAiAnalysis();
        aiAnalysis.setExamination(examination);
        aiAnalysis.setStatus(AnalysisStatus.PENDING);
        aiAnalysis.setSelectedFrameIndices(request.getSelectedFrameIndices());

        aiAnalysis = aiAnalysisRepository.save(aiAnalysis);

        List<String> codes = extractRequestedModules(request.getAnalysisTarget());

        for (String code : codes) {

            UsAiModule module = usAiModuleRepository.findByModuleCode(code)
                    .orElseThrow(() -> new IllegalArgumentException("Module not found: " + code));

            UsAnalysisModuleRun run = new UsAnalysisModuleRun();
            run.setAnalysis(aiAnalysis);
            run.setAiModule(module);
            //Versioning is sstatic for now
            run.setModuleVersion("V1.0");
            run.setStatus(AnalysisStatus.PENDING);

            // optional payload
            run.setRequestPayload(Map.of(
                    "regionFrames", request.getSelectedFrameIndices()
            ));
            analysisModuleRunRepository.save(run);
            aiAnalysis.getModuleRuns().add(run);
        }

        //Save analysis
        UsAiAnalysis saved = aiAnalysisRepository.save(aiAnalysis);

        UUID analysisUuid = saved.getAnalysisUuid();

        //Call python backend
        /* 
        CompletableFuture.runAsync(() -> {
            aiModuleService.analyze(analysisUuid,request.getAnalysisTarget());
        });*/

        try {
            log.error("[AI-ENTRY] analyze starting for analysisUuid={}", analysisUuid);
            aiModuleService.analyze(analysisUuid, request.getAnalysisTarget());
            log.error("[AI-ENTRY] analyze finished for analysisUuid={}", analysisUuid);
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
        /* For now we assume bboxes are always requested
        if (target.isBounding_boxes()) {
            codes.add("BOUNDING_BOXES");
        }*/

        return codes;
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
