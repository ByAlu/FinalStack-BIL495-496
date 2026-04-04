package com.backend.datamanagment.service;

import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.dto.UploadUrlResponseDTO;
import com.backend.model.entity.UsExaminationRegion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CloudService {
    Page<ExaminationVideoDTO> getExaminationVideoDTO(String url, Pageable pageable);
    UploadUrlResponseDTO generateBulkUploadUrls(String examName, List<UsExaminationRegion> regions);
}
