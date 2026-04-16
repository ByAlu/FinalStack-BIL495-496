package com.backend.ai.analysis.model.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class AnalysisRequest {
    @JsonProperty("video_url")
    private String videoUrl;
    @JsonProperty("frame_index")
    private Integer frameIndex;
    @JsonProperty("callback_url")
    private String callbackUrl;
    @JsonProperty("selected_modules")
    private AnalysisTarget selectedModules;

}
