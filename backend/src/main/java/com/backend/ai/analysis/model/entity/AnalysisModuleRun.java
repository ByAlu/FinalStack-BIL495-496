package com.backend.ai.analysis.model.entity;

import com.backend.model.entity.HealthDataType;

// Interface for one module-specific execution/result row inside an analysis batch.
public interface AnalysisModuleRun {
    Long getId();

    AiAnalysis getAnalysis();

    AiModule getAiModule();

    String getModuleVersion();

    AnalysisStatus getStatus();

    HealthDataType getDataType();
}
