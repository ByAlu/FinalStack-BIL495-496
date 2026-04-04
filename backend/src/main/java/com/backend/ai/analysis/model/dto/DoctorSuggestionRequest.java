package com.backend.ai.analysis.model.dto;

import com.backend.model.entity.UsExaminationRegion;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class DoctorSuggestionRequest {
    @NotBlank(message = "Examination id cannot be blank")
    private String examinationId;
    @NotNull(message = "Patient ID cannot be blank")
    private Long patientId;
    private List<DoctorSuggestionOfRegion> doctorSuggestions;
    @Getter
    @Setter
    @AllArgsConstructor
    public static class DoctorSuggestionOfRegion {
        @NotNull(message = "Examination region is not set")
        private UsExaminationRegion region;

        private Long bLines;
        private Long rdScore;

        @JsonIgnore
        private String imageUrl; // this will be set by backend after doctor suggestion is generated

        private String videourl; //whole image video url for doctor suggestion
    }
}
