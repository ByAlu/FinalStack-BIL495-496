package com.backend.datamanagment.controller;

import com.backend.cloud.service.CloudService;
import com.backend.datamanagment.service.ExaminationVideoListingService;
import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.dto.GCSPage;
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
    public ResponseEntity<GCSPage<ExaminationVideoDTO>> getExaminationVideosByPatientId(@RequestParam Long patientId,
                                                                                        @RequestParam(required = false) String pageToken,
                                                                                        Pageable pageable) {
        return ResponseEntity.ok(service.getExaminationVideosByPatientId(patientId,pageToken ,pageable));
    }

    /**
     *
     * @param examName Examination Id
     * @param regions Regions of photos
     * @return returns an unique upload URL for each region to be uploaded,
     * {cloudUrl}/ai/{patientId}/{examinationName}/{region}.png is the location of the uploaded file in the cloud storage.
     */
    @PostMapping("/{patientId}/{examName}/upload-urls")
    public ResponseEntity<UploadUrlResponseDTO> generateBulkUploadUrls(@PathVariable Long patientId,
                                                                       @PathVariable String examName,
                                                                       @RequestBody List<ExaminationRegion> regions) {
        return ResponseEntity.ok(cloudService.generateBulkUploadUrls(patientId,examName, regions));
    }

    @GetMapping("/{patientId}/{examName}")
    public ResponseEntity<List<ExaminationVideoDTO>> getVideos(@PathVariable Long patientId,
                                                               @PathVariable String examName) {
        return ResponseEntity.ok(cloudService.getExaminationVideoDTO(patientId, examName));
    }
}
