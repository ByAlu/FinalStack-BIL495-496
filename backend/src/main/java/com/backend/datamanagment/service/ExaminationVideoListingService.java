package com.backend.datamanagment.service;

import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.dto.GCSPage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ExaminationVideoListingService {
    GCSPage<ExaminationVideoDTO> getExaminationVideosByPatientId(Long patientId, String pageToken, Pageable pageable);
}
