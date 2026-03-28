package com.backend.model.repository;

import com.backend.model.entity.PatientExamination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PatientExaminationRepository extends JpaRepository<PatientExamination, Long> {

    List<PatientExamination> findByPatientId(Long patientId);
}