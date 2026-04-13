package com.backend.model.repository;

import com.backend.model.entity.AuditActionType;
import com.backend.model.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByActionTypeOrderByCreatedAtDesc(AuditActionType actionType);

    List<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, String entityId);
}
