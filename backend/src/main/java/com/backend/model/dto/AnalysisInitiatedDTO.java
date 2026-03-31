package com.backend.model.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
public class AnalysisInitiatedDTO {
    private UUID analysisId;
    private String status; // "PENDING"
}