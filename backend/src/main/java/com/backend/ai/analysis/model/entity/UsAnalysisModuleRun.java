package com.backend.ai.analysis.model.entity;

import com.backend.model.entity.HealthDataType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "us_analysis_module_runs")
@Getter
@Setter
// One ultrasound module execution/result within a larger ultrasound analysis batch.
public class UsAnalysisModuleRun implements AnalysisModuleRun {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "analysis_uuid", nullable = false)
    private UsAiAnalysis analysis;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ai_module_id", nullable = false)
    private UsAiModule aiModule;

    @Column(nullable = false, length = 32)
    private String moduleVersion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AnalysisStatus status = AnalysisStatus.PENDING;

    @Column(nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    private LocalDateTime completedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> requestPayload;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> responsePayload;

    @PrePersist
    protected void onCreate() {
        requestedAt = LocalDateTime.now();
    }

    @Override
    public HealthDataType getDataType() {
        return HealthDataType.ULTRASOUND;
    }
}
