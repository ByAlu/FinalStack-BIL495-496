package com.backend.ai.analysis.controller;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.AiAnalysisResultDTO;
import com.backend.ai.analysis.service.AiAnalysisService;
import com.backend.ai.analysis.service.AiModuleIntegrationService;
import com.backend.model.dto.AnalysisInitiatedDTO;
import com.backend.ai.analysis.model.dto.AiSuggestionRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai-analysis")
public class AiAnalysisController {
    @Autowired
    private AiAnalysisService aiAnalysisService;
    @Autowired
    private AiModuleIntegrationService aiModuleIntegrationService;
    
    //The ai module backend requires the following
    //callback url
    //video url
    //frame index of the image in video
    @PostMapping
    public ResponseEntity<AnalysisInitiatedDTO> startAnalysis(@Valid @RequestBody AiSuggestionRequest aiSuggestionRequest) {
        return ResponseEntity.accepted().body(aiAnalysisService.startAnalysis(aiSuggestionRequest));
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<AiAnalysisResultDTO> getAnalysis(@PathVariable UUID uuid) {
        return ResponseEntity.ok(aiModuleIntegrationService.getAnalysis(uuid));
    }

    @PostMapping("/callback")
    public ResponseEntity<Void> handleAiCallback(@RequestBody Map<String, Object> callbackPayload) {
        aiModuleIntegrationService.processCallBack(callbackPayload);
        return ResponseEntity.ok().build();
    }
}
