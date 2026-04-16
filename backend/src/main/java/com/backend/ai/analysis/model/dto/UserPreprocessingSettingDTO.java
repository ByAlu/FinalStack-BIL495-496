package com.backend.ai.analysis.model.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
public class UserPreprocessingSettingDTO {
    private String operationName;
    private String operationCode;
    private Integer displayOrder;
    private boolean active;
    private Map<String, Object> parameters;
}
