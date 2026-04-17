package com.backend.ai.analysis.model.dto;

import com.backend.ai.analysis.model.entity.AnalysisStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AiAnalysisModuleRunDTO {
    private Long id;
    private String externalJobId;
    private String moduleCode;
    private String moduleId;
    private String displayName;
    private String region;
    private Integer frameIndex;
    private AnalysisStatus status;
    private LocalDateTime requestedAt;
    private LocalDateTime completedAt;
    private Map<String, Object> requestPayload;
    private Map<String, Object> responsePayload;
    private Map<String, Object> resultData;
}
