package com.backend.storage.service;

import com.backend.storage.model.dto.FileResponseDTO;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    FileResponseDTO uploadFile(MultipartFile file, Long examinationId);
    boolean deleteFile(String fileName);
}
