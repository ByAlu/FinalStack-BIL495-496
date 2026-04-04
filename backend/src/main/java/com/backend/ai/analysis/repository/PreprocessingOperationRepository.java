package com.backend.ai.analysis.repository;

import com.backend.ai.analysis.model.entity.PreprocessingOperation;
import com.backend.model.entity.HealthDataType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PreprocessingOperationRepository extends JpaRepository<PreprocessingOperation, Long> {
    Optional<PreprocessingOperation> findByDataTypeAndOperationCode(HealthDataType dataType, String operationCode);

    List<PreprocessingOperation> findByDataTypeAndActiveTrueOrderByOperationNameAsc(HealthDataType dataType);
}
