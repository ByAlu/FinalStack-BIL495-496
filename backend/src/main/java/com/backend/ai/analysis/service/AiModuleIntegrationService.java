package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.AiAnalysisResultDTO;

import java.util.UUID;

public interface AiModuleIntegrationService {
    AiAnalysisDTO analyze(UUID analysisUuid);
    AiAnalysisResultDTO getAnalysis(UUID analysisUuid);
}
