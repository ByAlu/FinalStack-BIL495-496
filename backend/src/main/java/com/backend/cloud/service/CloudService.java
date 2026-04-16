package com.backend.cloud.service;

import com.backend.datamanagment.model.ExaminationDTO;
import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.dto.GCSPage;
import com.backend.model.dto.UploadUrlResponseDTO;
import com.backend.model.entity.UsExaminationRegion;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.Storage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface CloudService {
    Page<ExaminationVideoDTO> getExaminationVideoDTO(String url, Pageable pageable);

    UploadUrlResponseDTO generateBulkUploadUrls(Long patientId, String examName, List<UsExaminationRegion> regions);

    com.google.api.gax.paging.Page<Blob> listFilesWithPagination(String folder, int size, String token);

    String generateV4GetObjectSignedUrl(String cloudPath);

    List<ExaminationVideoDTO> getExaminationVideoDTO(Long patientId, String examName);

    GCSPage<ExaminationDTO> getExaminationsByPatientId(Long patientId, int size, String token);

    Storage getStorage();
}
