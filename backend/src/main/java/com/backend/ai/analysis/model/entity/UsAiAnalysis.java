package com.backend.ai.analysis.model.entity;

import com.backend.model.entity.HealthDataType;
import com.backend.model.entity.UsExamination;
import com.backend.model.entity.UsExaminationRegion;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "us_ai_analyses")
@Getter
@Setter
// One ultrasound analysis batch tied to a single examination and containing per-module run rows.
public class UsAiAnalysis implements AiAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID analysisUuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "examination_id")
    private UsExamination examination;

    @OneToMany(mappedBy = "analysis", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<UsAnalysisPreprocessingSetting> preprocessingSettings = new java.util.ArrayList<>();

    @OneToMany(mappedBy = "analysis", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UsAnalysisModuleRun> moduleRuns = new java.util.ArrayList<>();

    @OneToOne(mappedBy = "analysis", cascade = CascadeType.ALL, orphanRemoval = true)
    private UsAnalysisReport report;

    @Enumerated(EnumType.STRING)
    private AnalysisStatus status;

    @ElementCollection
    @CollectionTable(
            name = "us_analysis_region_frame_indices",
            joinColumns = @JoinColumn(name = "analysis_uuid")
    )
    @MapKeyEnumerated(EnumType.STRING)
    @MapKeyColumn(name = "region", length = 8)
    @Column(name = "frame_index", nullable = false)
    // Stores the user-picked representative frame index for each selected examination region.
    private Map<UsExaminationRegion, Integer> selectedFrameIndices = new HashMap<>();

    @JdbcTypeCode(SqlTypes.JSON) // Hibernate 6+ ile gelen modern yöntem
    private Map<String, Object> resultData;

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
