package com.backend.ai.analysis.repository;

import com.backend.ai.analysis.model.entity.UsAiModule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UsAiModuleRepository extends JpaRepository<UsAiModule, Long> {
    Optional<UsAiModule> findByModuleCode(String moduleCode);

    List<UsAiModule> findByActiveTrueOrderByDisplayNameAsc();
}
