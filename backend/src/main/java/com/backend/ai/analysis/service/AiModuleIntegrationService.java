package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisResultDTO;

import java.util.Map;
import java.util.UUID;

public interface AiModuleIntegrationService {
    AiAnalysisResultDTO analyze(UUID analysisUuid);
    AiAnalysisResultDTO getAnalysis(UUID analysisUuid);
    void processCallBack(Map<String, Object> callbackPayload);
}
