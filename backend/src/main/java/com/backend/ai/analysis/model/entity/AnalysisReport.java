package com.backend.ai.analysis.model.entity;

import java.time.LocalDateTime;

// Interface for assembled analysis reports across different health data types.
public interface AnalysisReport {
    Long getId();

    AiAnalysis getAnalysis();

    DoctorSuggestion getDoctorSuggestion();

    String getExportedPdfUrl();

    String getExportedDocUrl();

    LocalDateTime getCreatedAt();

    LocalDateTime getUpdatedAt();
}
