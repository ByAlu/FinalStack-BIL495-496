package com.backend.datamanagment.service;

import com.backend.cloud.service.CloudService;
import com.backend.model.dto.ExaminationVideoDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ExaminationVideoListingServiceImpl implements ExaminationVideoListingService{

    private final String videoBaseUrl;

    @Autowired
    private CloudService cloudService;

    public ExaminationVideoListingServiceImpl(@Value("${video.cloud-storage.url}") String videoBaseUrl) {
        this.videoBaseUrl = videoBaseUrl;
    }
    @Override
    public Page<ExaminationVideoDTO> getExaminationVideosByPatientId(Long patientId, Pageable pageable) {
        String patientUrlPrefix = videoBaseUrl + patientId ;
        return cloudService.getExaminationVideoDTO(patientUrlPrefix, pageable);
    }
}
