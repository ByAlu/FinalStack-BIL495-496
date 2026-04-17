package com.backend.ai.analysis.model.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AiAnalysisPreprocessingSettingDTO {
    private String operationName;
    private String operationCode;
    private Integer displayOrder;
    private boolean active;
    private Map<String, Object> parameters;
}
