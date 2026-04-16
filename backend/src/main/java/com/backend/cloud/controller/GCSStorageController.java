package com.backend.cloud.controller;

import com.backend.cloud.service.CloudService;
import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.dto.UploadUrlResponseDTO;
import com.backend.model.entity.UsExaminationRegion;
import com.google.api.gax.paging.Page;
import com.google.cloud.storage.Blob;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/assets")
public class GCSStorageController {

    @Qualifier("GCSStorageService")
    @Autowired
    private CloudService storageService;


    // 2. Videoları listelemek için (Pageable simülasyonu)
    @GetMapping("/list")
    public ResponseEntity<Page<Blob>> listVideos(
            @RequestParam String folder,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String token) {
        return ResponseEntity.ok(storageService.listFilesWithPagination(folder+'/', size, token));
    }

}