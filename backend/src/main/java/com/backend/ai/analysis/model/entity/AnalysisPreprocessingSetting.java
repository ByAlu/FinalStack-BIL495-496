package com.backend.ai.analysis.model.entity;

import com.backend.model.entity.HealthDataType;

import java.util.Map;

// Interface for analysis-time preprocessing setting snapshots across different health data types.
public interface AnalysisPreprocessingSetting {
    Long getId();

    AiAnalysis getAnalysis();

    HealthDataType getDataType();

    String getOperationName();

    String getOperationCode();

    Integer getDisplayOrder();

    boolean isActive();

    Map<String, Object> getParameters();
}
