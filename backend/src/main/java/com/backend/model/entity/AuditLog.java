package com.backend.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "audit_logs")
@Getter
@Setter
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private User actor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 64)
    private AuditActionType actionType;

    @Column(nullable = false, length = 128)
    private String entityType;

    @Column(nullable = false, length = 128)
    private String entityId;

    @Column(nullable = false, length = 2048)
    private String description;

    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, Object> metadata;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
