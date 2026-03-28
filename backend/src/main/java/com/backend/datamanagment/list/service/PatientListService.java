package com.backend.datamanagment.list.service;

import com.backend.model.dto.PatientDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface PatientListService {
    Page<PatientDTO> searchPatientByName(String name, Pageable pageable);
    PatientDTO getPatientById(Long id);
}
