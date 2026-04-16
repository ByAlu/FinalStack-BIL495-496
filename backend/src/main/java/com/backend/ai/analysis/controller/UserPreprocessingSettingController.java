package com.backend.ai.analysis.controller;

import com.backend.ai.analysis.model.dto.UserPreprocessingSettingDTO;
import com.backend.ai.analysis.service.UserPreprocessingSettingService;
import com.backend.model.entity.HealthDataType;
import com.backend.model.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/preprocessing-settings")
@RequiredArgsConstructor
public class UserPreprocessingSettingController {
    private final UserPreprocessingSettingService userPreprocessingSettingService;

    @GetMapping("/me")
    public ResponseEntity<List<UserPreprocessingSettingDTO>> getCurrentUserSettings(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "ULTRASOUND") HealthDataType dataType
    ) {
        return ResponseEntity.ok(userPreprocessingSettingService.getCurrentUserSettings(user, dataType));
    }

    @PutMapping("/me")
    public ResponseEntity<List<UserPreprocessingSettingDTO>> saveCurrentUserSettings(
            @AuthenticationPrincipal User user,
            @RequestParam(defaultValue = "ULTRASOUND") HealthDataType dataType,
            @RequestBody List<UserPreprocessingSettingDTO> settings
    ) {
        return ResponseEntity.ok(userPreprocessingSettingService.saveCurrentUserSettings(user, dataType, settings));
    }
}
