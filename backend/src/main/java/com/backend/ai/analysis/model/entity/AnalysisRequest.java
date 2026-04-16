package com.backend.ai.analysis.model.entity;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class AnalysisRequest {
    private String videoUrl;
    private Integer frameIndex;
    private String callbackUrl;
    private AnalysisTarget analysisTarget;

}
