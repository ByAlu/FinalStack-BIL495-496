package com.backend.model.entity;

import java.time.LocalDateTime;

// Interface for examinations across different health data types.
public interface Examination {
    Long getId();

    String getExternalExaminationId();

    String getExternalPatientId();

    HealthDataType getDataType();

    LocalDateTime getExaminationDate();
}
