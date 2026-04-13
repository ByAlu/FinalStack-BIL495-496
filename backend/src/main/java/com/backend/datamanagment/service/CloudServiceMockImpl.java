package com.backend.datamanagment.service;

import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.dto.UploadUrlResponseDTO;
import com.backend.model.entity.UsExaminationRegion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CloudServiceMockImpl implements CloudService {
    @Override
    public Page<ExaminationVideoDTO> getExaminationVideoDTO(String url, Pageable pageable) {
        // Şimdilik boş dönüyoruz, padoğu kurunca içini dolduracağız.
        return Page.empty(pageable);
    }

    @Override
    public UploadUrlResponseDTO generateBulkUploadUrls(String examName, List<UsExaminationRegion> regions) {
        return new UploadUrlResponseDTO(examName, List.of());
    }

}
