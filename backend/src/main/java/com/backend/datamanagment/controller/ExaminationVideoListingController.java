package com.backend.datamanagment.controller;

import com.backend.datamanagment.service.CloudService;
import com.backend.datamanagment.service.ExaminationVideoListingService;
import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.dto.UploadUrlResponseDTO;
import com.backend.model.entity.ExaminationRegion;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/examinations")
public class ExaminationVideoListingController {
    @Autowired
    private ExaminationVideoListingService service;
    @Autowired
    private CloudService cloudService;

    /**
     *
     * @param patientId Patient Id to filter examination videos
     * @param pageable Pagination information (page number, page size, sorting)
     * @return page of Examination Video datas, containing video URL and metadata
     */
    @GetMapping
    public ResponseEntity<Page<ExaminationVideoDTO>> getExaminationVideosByPatientId(@RequestParam Long patientId,
                                                                                    Pageable pageable) {
        return ResponseEntity.ok(service.getExaminationVideosByPatientId(patientId, pageable));
    }

    /**
     *
     * @param examName Examination Id
     * @param regions Regions of photos
     * @return returns an unique upload URL for each region to be uploaded,
     * {cloudUrl}/ai/{patientId}/{examinationName}/{region}.png is the location of the uploaded file in the cloud storage.
     */
    @PostMapping("/{examName}/upload-urls")
    public ResponseEntity<UploadUrlResponseDTO> generateBulkUploadUrls(@PathVariable String examName,
                                                                       @RequestBody List<ExaminationRegion> regions) {
        return ResponseEntity.ok(cloudService.generateBulkUploadUrls(examName, regions));
    }
}
