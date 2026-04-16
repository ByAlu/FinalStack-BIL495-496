package com.backend.datamanagment.service;

import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.dto.GCSPage;
import org.springframework.data.domain.Pageable;

import java.util.Map;

public interface ExaminationVideoListingService {
    GCSPage<Map<String, Object>> getExaminationVideosByPatientId(Long patientId, String pageToken, Pageable pageable);
}
