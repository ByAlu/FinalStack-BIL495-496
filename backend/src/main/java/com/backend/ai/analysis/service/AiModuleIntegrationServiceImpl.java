package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.AiAnalysisResultDTO;
import com.backend.ai.analysis.model.entity.AnalysisStatus;
import com.backend.ai.analysis.model.entity.UsAiAnalysis;
import com.backend.ai.analysis.repository.UsAiAnalysisRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AiModuleIntegrationServiceImpl implements AiModuleIntegrationService {

    @Autowired
    private UsAiAnalysisRepository aiAnalysisRepository;
    @Override
    public AiAnalysisDTO analyze(UUID analysisUuid) {
        AiAnalysisDTO aiAnalysisDTO = new AiAnalysisDTO();
        aiAnalysisDTO.setAnalysisUuid(analysisUuid);
        aiAnalysisDTO.setAnalysisStatus(AnalysisStatus.PROCESSING);
        return aiAnalysisDTO;
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
}
