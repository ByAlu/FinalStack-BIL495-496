package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.DoctorSuggestionRequest;
import com.backend.ai.analysis.model.entity.AnalysisStatus;
import com.backend.ai.analysis.model.entity.UsAiAnalysis;
import com.backend.ai.analysis.repository.UsAiAnalysisRepository;
import com.backend.model.dto.AnalysisInitiatedDTO;
import com.backend.model.entity.UsExamination;
import com.backend.model.entity.UsExaminationRegion;
import com.backend.model.repository.UsExaminationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
public class AiAnalysisServiceImpl implements AiAnalysisService {
    @Autowired
    private AiModuleIntegrationService aiModuleService;
    @Autowired
    private UsAiAnalysisRepository aiAnalysisRepository;
    @Autowired
    private UsExaminationRepository usExaminationRepository;

    private final String videoBaseUrl;

    public AiAnalysisServiceImpl(@Value("${video.cloud-storage.url}") String videoBaseUrl) {
        this.videoBaseUrl = videoBaseUrl;
    }

    @Override
    @Transactional
    public AnalysisInitiatedDTO startAnalysis(DoctorSuggestionRequest request) {
        UsExamination examination = usExaminationRepository.findByExternalExaminationId(request.getExaminationId())
                .orElseThrow(() -> new IllegalArgumentException("Examination not found: " + request.getExaminationId()));

        UsAiAnalysis aiAnalysis = new UsAiAnalysis();
        aiAnalysis.setExamination(examination);
        aiAnalysis.setStatus(AnalysisStatus.PENDING);
        UsAiAnalysis saved = aiAnalysisRepository.save(aiAnalysis);
        UUID analysisUuid = saved.getAnalysisUuid();
        CompletableFuture.runAsync(() -> {
            aiModuleService.analyze(analysisUuid);
        });
        return new AnalysisInitiatedDTO(saved.getAnalysisUuid(),saved.getStatus().name());
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
