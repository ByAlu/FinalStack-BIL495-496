package com.backend.ai.analysis.controller;

import com.backend.ai.analysis.service.AiAnalysisService;
import com.backend.model.dto.AnalysisInitiatedDTO;
import com.backend.ai.analysis.model.dto.DoctorSuggestionRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai-analysis")
public class AiAnalysisController {
    @Autowired
    private AiAnalysisService aiAnalysisService;
    
    @PostMapping
    public ResponseEntity<AnalysisInitiatedDTO> startAnalysis(@Valid @RequestBody DoctorSuggestionRequest doctorSuggestionRequest) {
        UUID analysisId = UUID.randomUUID();

        return ResponseEntity.accepted().body(aiAnalysisService.startAnalysis(doctorSuggestionRequest));
    }
}
