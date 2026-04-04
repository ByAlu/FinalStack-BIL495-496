package com.backend.ai.analysis.repository;

import com.backend.ai.analysis.model.entity.UsAnalysisPreprocessingSetting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AnalysisPreprocessingSettingRepository extends JpaRepository<UsAnalysisPreprocessingSetting, Long> {
    List<UsAnalysisPreprocessingSetting> findByAnalysisAnalysisUuidOrderByDisplayOrderAsc(UUID analysisUuid);
}
