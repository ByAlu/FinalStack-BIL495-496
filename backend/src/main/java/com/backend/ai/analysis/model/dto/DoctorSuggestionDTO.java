package com.backend.ai.analysis.model.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class DoctorSuggestionDTO {
    private String finalDiagnosis;
    private String treatmentRecommendation;
    private String followUpRecommendation;
}
