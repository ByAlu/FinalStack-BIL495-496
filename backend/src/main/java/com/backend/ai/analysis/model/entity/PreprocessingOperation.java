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
@Table(
        name = "preprocessing_operations",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_preprocessing_operation_type_code",
                columnNames = {"data_type", "operation_code"} // unique data_type - operation_code couples
        )
)
@Getter
@Setter
// Fixed preprocessing operation catalog for a specific health data type.
public class PreprocessingOperation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, length = 32)
    private HealthDataType dataType = HealthDataType.ULTRASOUND;

    @Column(name = "operation_name", nullable = false, length = 128)
    private String operationName;

    @Column(name = "operation_code", nullable = false, length = 64)
    private String operationCode;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "default_parameters", nullable = false)
    private Map<String, Object> defaultParameters;

    @Column(nullable = false)
    private boolean active = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
