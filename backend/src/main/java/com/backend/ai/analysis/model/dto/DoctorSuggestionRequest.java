package com.backend.ai.analysis.model.dto;

import com.backend.model.entity.UsExaminationRegion;
import com.backend.ai.analysis.model.entity.AnalysisTarget;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class DoctorSuggestionRequest {
    @NotBlank(message = "Examination id cannot be blank")
    private String examinationId;

    @NotNull(message = "Patient ID cannot be blank")
    private String patientId;

    @NotNull(message = "Selected frames can not be empty")
    Map<UsExaminationRegion, Integer> selectedFrameIndices;

    @NotNull(message = "Analysis target must be specified")
    private AnalysisTarget analysisTarget;

    @Override
    public String toString() {
        return "DoctorSuggestionRequest{" +
                "examinationId='" + examinationId + '\'' +
                ", patientId='" + patientId + '\'' +
                ", selectedFrameIndices=" + selectedFrameIndices +
                ", targets=" + analysisTarget +
                '}';
    }
}
