package com.backend.ai.analysis.repository;

import com.backend.ai.analysis.model.entity.UsAiAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UsAiAnalysisRepository extends JpaRepository<UsAiAnalysis, UUID> {
}
