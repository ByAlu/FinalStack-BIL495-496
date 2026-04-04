package com.backend.cloud.service;

import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.dto.UploadUrlResponseDTO;
import com.backend.model.entity.ExaminationRegion;
import com.google.cloud.storage.Blob;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CloudService {
    Page<ExaminationVideoDTO> getExaminationVideoDTO(String url, Pageable pageable);

    UploadUrlResponseDTO generateBulkUploadUrls(Long patientId, String examName, List<ExaminationRegion> regions);

    com.google.api.gax.paging.Page<Blob> listFilesWithPagination(String folder, int size, String token);

    List<ExaminationVideoDTO> getExaminationVideoDTO(Long patientId, String examName);
}
