package com.backend.ai.analysis.repository;

import com.backend.ai.analysis.model.entity.UsAnalysisReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AnalysisReportRepository extends JpaRepository<UsAnalysisReport, Long> {
    Optional<UsAnalysisReport> findByAnalysisAnalysisUuid(UUID analysisUuid);
}
