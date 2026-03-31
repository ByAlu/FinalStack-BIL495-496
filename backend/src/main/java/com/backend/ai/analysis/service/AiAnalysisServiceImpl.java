package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.DoctorSuggestionRequest;
import com.backend.ai.analysis.model.entity.AiAnalysis;
import com.backend.ai.analysis.model.entity.AnalysisStatus;
import com.backend.ai.analysis.model.entity.DoctorSuggestion;
import com.backend.ai.analysis.repository.AiAnalysisRepository;
import com.backend.model.dto.AnalysisInitiatedDTO;
import com.backend.model.entity.ExaminationRegion;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
public class AiAnalysisServiceImpl implements AiAnalysisService {
    @Autowired
    private AiModuleIntegrationService aiModuleService;
    @Autowired
    private AiAnalysisRepository aiAnalysisRepository;

    private final String videoBaseUrl;

    public AiAnalysisServiceImpl(@Value("${video.cloud-storage.url}") String videoBaseUrl) {
        this.videoBaseUrl = videoBaseUrl;
    }

    @Override
    @Transactional
    public AnalysisInitiatedDTO startAnalysis(DoctorSuggestionRequest request) {
        AiAnalysis aiAnalysis = new AiAnalysis();
        aiAnalysis.setPatientId(request.getPatientId());
        aiAnalysis.setStatus(AnalysisStatus.PENDING);
        aiAnalysis.setExaminationName(request.getExaminationName());

        List<DoctorSuggestion> doctorSuggestions= request.getDoctorSuggestions().stream().map(dto->{
            DoctorSuggestion suggestion = new DoctorSuggestion();
            suggestion.setExaminationRegion(dto.getRegion());
            suggestion.setUrl(this.getImageUrl(request.getPatientId(), request.getExaminationName(), dto.getRegion()));
            suggestion.setRdScore(dto.getRdScore());
            suggestion.setBLines(dto.getBLines());
            suggestion.setAiAnalysis(aiAnalysis);
            return suggestion;
        }).toList();

        aiAnalysis.setSuggestions(doctorSuggestions);
        AiAnalysis saved = aiAnalysisRepository.save(aiAnalysis);
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
                               ExaminationRegion region) {
        return this.videoBaseUrl+"/ai/"+patientId+"/"+examinationName+"/"+region.name()+".png";
    }
}
