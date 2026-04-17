package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.DoctorSuggestionDTO;

import java.util.UUID;

public interface DoctorSuggestionService {
    DoctorSuggestionDTO getByAnalysisUuid(UUID analysisUuid);

    DoctorSuggestionDTO saveByAnalysisUuid(UUID analysisUuid, DoctorSuggestionDTO doctorSuggestionDTO);
}
