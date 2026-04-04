package com.backend.model.dto;

import com.backend.model.entity.UsExaminationRegion;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class UploadUrlResponseDTO {
    private String examinationName;
    private List<UploadTarget> targets;

    @Getter
    @Setter
    @AllArgsConstructor
    public static class UploadTarget {
        private UsExaminationRegion region;
        private String uploadUrl;
    }
}
