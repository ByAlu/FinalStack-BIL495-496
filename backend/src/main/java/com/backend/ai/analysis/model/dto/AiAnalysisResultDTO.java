package com.backend.ai.analysis.model.dto;

import com.backend.ai.analysis.model.entity.AnalysisStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.backend.model.entity.UsExaminationRegion;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AiAnalysisResultDTO {

    private UUID analysisUuid;
    private String patientId;
    private String examinationId;
    private AnalysisStatus status;
    private Map<UsExaminationRegion, Integer> selectedFrameIndices;
    private List<AiAnalysisPreprocessingSettingDTO> preprocessingSettings;
    private List<AiAnalysisModuleRunDTO> moduleRuns;

    // AI'dan gelen verileri map'leyeceğimiz alan
    private Map<String, Object> resultData;
}
