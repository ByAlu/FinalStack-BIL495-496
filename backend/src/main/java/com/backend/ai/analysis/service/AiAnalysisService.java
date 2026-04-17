package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisResultDTO;
import com.backend.ai.analysis.model.dto.DoctorSuggestionRequest;

public interface AiAnalysisService {
    AiAnalysisResultDTO startAnalysis(DoctorSuggestionRequest doctorSuggestionRequest);
}
