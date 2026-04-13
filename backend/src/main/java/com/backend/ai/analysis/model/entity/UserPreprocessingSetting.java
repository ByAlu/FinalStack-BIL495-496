package com.backend.ai.analysis.model.entity;

import com.backend.model.entity.HealthDataType;
import com.backend.model.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(
        name = "user_preprocessing_settings",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_user_preprocessing_owner_type_operation",
                columnNames = {"owner_user_id", "data_type", "operation_code"}
        )
)
@Getter
@Setter
// Per-user preprocessing configuration for one fixed preprocessing operation.
public class UserPreprocessingSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_type", nullable = false, length = 32)
    private HealthDataType dataType = HealthDataType.ULTRASOUND;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "operation_id", nullable = false)
    private PreprocessingOperation operation;

    @Column(name = "operation_name", nullable = false, length = 128)
    private String operationName;

    @Column(name = "operation_code", nullable = false, length = 64)
    private String operationCode;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;

    @Column(nullable = false)
    private boolean active = true;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false)
    private Map<String, Object> parameters;

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
