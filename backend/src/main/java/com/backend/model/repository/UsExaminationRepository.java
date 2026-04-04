package com.backend.model.repository;

import com.backend.model.entity.UsExamination;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UsExaminationRepository extends JpaRepository<UsExamination, Long> {
    Optional<UsExamination> findByExternalExaminationId(String externalExaminationId);

    List<UsExamination> findByExternalPatientIdOrderByExaminationDateDesc(String externalPatientId);
}
