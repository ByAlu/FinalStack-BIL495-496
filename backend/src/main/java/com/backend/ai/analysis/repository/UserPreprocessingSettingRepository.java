package com.backend.ai.analysis.repository;

import com.backend.ai.analysis.model.entity.UserPreprocessingSetting;
import com.backend.model.entity.HealthDataType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserPreprocessingSettingRepository extends JpaRepository<UserPreprocessingSetting, Long> {
    Optional<UserPreprocessingSetting> findByOwnerIdAndDataTypeAndOperationCode(Long ownerId, HealthDataType dataType, String operationCode);

    List<UserPreprocessingSetting> findByOwnerIdAndDataTypeOrderByDisplayOrderAsc(Long ownerId, HealthDataType dataType);
}
