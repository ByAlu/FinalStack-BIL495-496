package com.backend.ai.analysis.model.dto;

import com.backend.ai.analysis.model.entity.AnalysisStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AiAnalysisResultDTO {

    private UUID analysisUuid;
    private AnalysisStatus status;

    // AI'dan gelen verileri map'leyeceğimiz alan
    private Map<String, Object> resultData;
}
