package com.backend.ai.analysis.controller;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.AiAnalysisResultDTO;
import com.backend.ai.analysis.service.AiAnalysisService;
import com.backend.ai.analysis.service.AiModuleIntegrationService;
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
    @Autowired
    private AiModuleIntegrationService aiModuleIntegrationService;
    
    @PostMapping
    public ResponseEntity<AnalysisInitiatedDTO> startAnalysis(@Valid @RequestBody DoctorSuggestionRequest doctorSuggestionRequest) {
        return ResponseEntity.accepted().body(aiAnalysisService.startAnalysis(doctorSuggestionRequest));
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<AiAnalysisResultDTO> getAnalysis(@PathVariable UUID uuid) {
        return ResponseEntity.ok(aiModuleIntegrationService.getAnalysis(uuid));
    }
}
