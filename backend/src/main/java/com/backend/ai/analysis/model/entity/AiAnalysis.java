package com.backend.ai.analysis.model.entity;

import com.backend.model.entity.HealthDataType;

import java.util.UUID;

// Interface for one analysis batch regardless of health data type.
public interface AiAnalysis {
    UUID getAnalysisUuid();

    Long getPatientId();

    AnalysisStatus getStatus();

    HealthDataType getDataType();
}
