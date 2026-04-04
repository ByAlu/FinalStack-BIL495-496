package com.backend.model.entity;

import com.backend.ai.analysis.model.entity.UsAiAnalysis;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "us_examinations")
@Getter
@Setter
// Concrete persisted examination for the currently implemented ultrasound workflow.
public class UsExamination implements Examination {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    //for search
    @Column(nullable = false, unique = true, length = 128)
    private String externalExaminationId;

    //for serach
    @Column(nullable = false, length = 64)
    private String externalPatientId;

    @Column(nullable = false)
    private LocalDateTime examinationDate;

    @OneToMany(mappedBy = "examination", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UsExaminationVideo> videos = new ArrayList<>();

    @OneToMany(mappedBy = "examination")
    private List<UsAiAnalysis> analyses = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    @Override
    public HealthDataType getDataType() {
        return HealthDataType.ULTRASOUND;
    }
}
