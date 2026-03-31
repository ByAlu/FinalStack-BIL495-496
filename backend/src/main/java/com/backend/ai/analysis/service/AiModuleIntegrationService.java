package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.DoctorSuggestionRequest;

import java.util.UUID;

public interface AiModuleIntegrationService {
    AiAnalysisDTO analyze(UUID analysisUuid);
}
