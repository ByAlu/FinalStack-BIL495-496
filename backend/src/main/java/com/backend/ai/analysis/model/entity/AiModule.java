package com.backend.ai.analysis.model.entity;

import com.backend.model.entity.HealthDataType;

// Interface for selectable AI modules across different health data types.
public interface AiModule {
    Long getId();

    String getModuleCode();

    String getDisplayName();

    String getDescription();

    boolean isActive();

    HealthDataType getDataType();
}
