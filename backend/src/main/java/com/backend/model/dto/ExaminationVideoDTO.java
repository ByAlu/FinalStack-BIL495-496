package com.backend.model.dto;

import com.backend.model.entity.UsExaminationRegion;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;


@Getter
@Setter
public class ExaminationVideoDTO {
    public ExaminationVideoDTO(Long patientId, UsExaminationRegion examinationRegion) {
        this.uploadDate=LocalDateTime.now();
        this.patientId=patientId;
        this.region=examinationRegion;
    }

    LocalDateTime examinationDate;

    String examinationName;

    private Long patientId;

    private String url;

    private String thumbnailUrl;

    private UsExaminationRegion region;

    private LocalDateTime uploadDate;

    private Long fileSize;

}
