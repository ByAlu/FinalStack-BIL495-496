package com.backend.ai.analysis.repository;

import com.backend.ai.analysis.model.entity.AiAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AiAnalysisRepository extends JpaRepository<AiAnalysis, UUID> {
    Long findPatientIdByExaminationName(String examName);
}
