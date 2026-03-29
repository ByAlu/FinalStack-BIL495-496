package com.backend.storage.model.dto;

import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@Getter
@Setter
public class FileResponseDTO {
    private String fileName;
    private String fileUrl;
    private String fileType;
    private Long size;
    private String message;
}
