package com.backend.datamanagment.service;

import com.backend.model.dto.ExaminationVideoDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ExaminationVideoListingService {
    Page<ExaminationVideoDTO> getExaminationVideosByPatientId(Long patientId, Pageable pageable);
}
