package com.backend.ai.analysis.model.dto;

import com.backend.ai.analysis.model.entity.AnalysisStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AiAnalysisDTO {
    // Test için bir mesaj alanı ekleyelim
    private UUID analysisUuid;
    private AnalysisStatus analysisStatus;
}
