package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.DoctorSuggestionRequest;
import com.backend.ai.analysis.model.entity.AnalysisStatus;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AiModuleIntegrationServiceImpl implements AiModuleIntegrationService {

    @Override
    public AiAnalysisDTO analyze(UUID analysisUuid) {
        AiAnalysisDTO aiAnalysisDTO = new AiAnalysisDTO();
        aiAnalysisDTO.setAnalysisUuid(analysisUuid);
        aiAnalysisDTO.setAnalysisStatus(AnalysisStatus.PROCESSING);
        return aiAnalysisDTO;
    }
}
