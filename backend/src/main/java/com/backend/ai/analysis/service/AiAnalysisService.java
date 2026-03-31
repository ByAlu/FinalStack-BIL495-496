package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.DoctorSuggestionRequest;
import com.backend.model.dto.AnalysisInitiatedDTO;

public interface AiAnalysisService {
    AnalysisInitiatedDTO startAnalysis(DoctorSuggestionRequest doctorSuggestionRequest);
}
