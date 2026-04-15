package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.AiAnalysisResultDTO;
import com.backend.ai.analysis.model.entity.AnalysisTarget;

import java.util.Map;
import java.util.UUID;

public interface AiModuleIntegrationService {
    AiAnalysisDTO analyze(UUID analysisUuid, AnalysisTarget target);
    AiAnalysisResultDTO getAnalysis(UUID analysisUuid);
    void processCallBack(Map<String, Object> callbackPayload);
}
