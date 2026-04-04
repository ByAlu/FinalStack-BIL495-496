package com.backend.ai.analysis.repository;

import com.backend.ai.analysis.model.entity.UsAnalysisModuleRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AnalysisModuleRunRepository extends JpaRepository<UsAnalysisModuleRun, Long> {
    List<UsAnalysisModuleRun> findByAnalysisAnalysisUuid(UUID analysisUuid);
}
