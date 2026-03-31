package com.backend.ai.analysis.repository;

import com.backend.ai.analysis.model.entity.DoctorSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DoctorSuggestionRepository extends JpaRepository<DoctorSuggestion,Long> {
}
