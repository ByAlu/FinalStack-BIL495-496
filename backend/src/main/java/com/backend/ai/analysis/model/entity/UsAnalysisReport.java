package com.backend.ai.analysis.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "analysis_reports")
@Getter
@Setter
// Aggregates doctor-authored report content around a completed ultrasound analysis.
public class UsAnalysisReport implements AnalysisReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "analysis_uuid", nullable = false, unique = true)
    private UsAiAnalysis analysis;

    @OneToOne(mappedBy = "analysisReport", cascade = CascadeType.ALL, orphanRemoval = true)
    private DoctorSuggestion doctorSuggestion;

    @Column(length = 2048)
    private String exportedPdfUrl;

    @Column(length = 2048)
    private String exportedDocUrl;

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
}
