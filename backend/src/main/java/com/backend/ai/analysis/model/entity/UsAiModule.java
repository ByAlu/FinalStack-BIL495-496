package com.backend.ai.analysis.model.entity;

import com.backend.model.entity.HealthDataType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "us_ai_modules")
@Getter
@Setter
// Concrete ultrasound AI module definition shown to users as a selectable module.
public class UsAiModule implements AiModule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    //RDS_SCORING and B_LINE_DETECTION
    @Column(nullable = false, unique = true, length = 64)
    private String moduleCode;

    @Column(nullable = false, length = 128)
    private String displayName;

    @Column(length = 2048)
    private String description;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @Override
    public HealthDataType getDataType() {
        return HealthDataType.ULTRASOUND;
    }
}
