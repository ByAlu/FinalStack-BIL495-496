package com.backend.model.dto;

import com.backend.model.entity.ExaminationRegion;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class UploadUrlResponseDTO {
    private Long examinationId;
    private List<UploadTarget> targets;

    @Getter
    @Setter
    @AllArgsConstructor
    public static class UploadTarget {
        private ExaminationRegion region;
        private String uploadUrl;
    }
}