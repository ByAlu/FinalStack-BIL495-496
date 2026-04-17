package com.backend.ai.analysis.controller;

import com.backend.ai.analysis.model.dto.AiAnalysisResultDTO;
import com.backend.ai.analysis.model.dto.AiModuleOptionDTO;
import com.backend.ai.analysis.model.dto.DoctorSuggestionDTO;
import com.backend.ai.analysis.service.AiAnalysisService;
import com.backend.ai.analysis.service.AiModuleCatalogService;
import com.backend.ai.analysis.service.AiModuleIntegrationService;
import com.backend.ai.analysis.service.DoctorSuggestionService;
import com.backend.ai.analysis.model.dto.DoctorSuggestionRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai-analysis")
public class AiAnalysisController {
    @Autowired
    private AiAnalysisService aiAnalysisService;
    @Autowired
    private AiModuleIntegrationService aiModuleIntegrationService;
    @Autowired
    private AiModuleCatalogService aiModuleCatalogService;
    @Autowired
    private DoctorSuggestionService doctorSuggestionService;

    @GetMapping("/modules")
    public ResponseEntity<List<AiModuleOptionDTO>> getAvailableModules() {
        return ResponseEntity.ok(aiModuleCatalogService.getAvailableModules());
    }
    
    @PostMapping
    public ResponseEntity<AiAnalysisResultDTO> startAnalysis(@Valid @RequestBody DoctorSuggestionRequest doctorSuggestionRequest) {
        return ResponseEntity.ok(aiAnalysisService.startAnalysis(doctorSuggestionRequest));
    }

    @GetMapping("/{uuid}")
    public ResponseEntity<AiAnalysisResultDTO> getAnalysis(@PathVariable UUID uuid) {
        return ResponseEntity.ok(aiModuleIntegrationService.getAnalysis(uuid));
    }

    @GetMapping("/{uuid}/doctor-suggestion")
    public ResponseEntity<DoctorSuggestionDTO> getDoctorSuggestion(@PathVariable UUID uuid) {
        return ResponseEntity.ok(doctorSuggestionService.getByAnalysisUuid(uuid));
    }

    @PutMapping("/{uuid}/doctor-suggestion")
    public ResponseEntity<DoctorSuggestionDTO> saveDoctorSuggestion(
            @PathVariable UUID uuid,
            @RequestBody DoctorSuggestionDTO doctorSuggestionDTO
    ) {
        return ResponseEntity.ok(doctorSuggestionService.saveByAnalysisUuid(uuid, doctorSuggestionDTO));
    }

    @PostMapping("/callback")
    public ResponseEntity<Void> handleAiCallback(@RequestBody Map<String, Object> callbackPayload) {
        aiModuleIntegrationService.processCallBack(callbackPayload);
        return ResponseEntity.ok().build();
    }
}
