package com.backend.ai.analysis.model.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AiModuleOptionDTO {
    private String moduleCode;
    private String moduleId;
    private String displayName;
    private String description;
}
