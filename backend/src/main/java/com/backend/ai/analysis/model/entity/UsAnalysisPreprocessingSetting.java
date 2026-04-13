package com.backend.ai.analysis.model.entity;

import com.backend.model.entity.HealthDataType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Table(name = "us_analysis_preprocessing_settings")
@Getter
@Setter
// One persisted ultrasound preprocessing snapshot stored under an ultrasound analysis batch.
public class UsAnalysisPreprocessingSetting implements AnalysisPreprocessingSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "analysis_uuid", nullable = false)
    private UsAiAnalysis analysis;

    @Column(name = "operation_name", nullable = false, length = 128)
    private String operationName;

    @Column(name = "operation_code", nullable = false, length = 64)
    private String operationCode;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(nullable = false)
    private boolean active = true;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> parameters;

    @Override
    public HealthDataType getDataType() {
        return HealthDataType.ULTRASOUND;
    }
}
