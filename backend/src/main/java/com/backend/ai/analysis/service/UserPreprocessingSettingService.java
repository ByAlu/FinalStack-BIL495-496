package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.UserPreprocessingSettingDTO;
import com.backend.model.entity.HealthDataType;
import com.backend.model.entity.User;

import java.util.List;

public interface UserPreprocessingSettingService {
    List<UserPreprocessingSettingDTO> getCurrentUserSettings(User user, HealthDataType dataType);

    List<UserPreprocessingSettingDTO> saveCurrentUserSettings(
            User user,
            HealthDataType dataType,
            List<UserPreprocessingSettingDTO> settings
    );
}
