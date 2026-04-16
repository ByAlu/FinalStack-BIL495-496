package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.UserPreprocessingSettingDTO;
import com.backend.ai.analysis.model.entity.PreprocessingOperation;
import com.backend.ai.analysis.model.entity.UserPreprocessingSetting;
import com.backend.ai.analysis.repository.PreprocessingOperationRepository;
import com.backend.ai.analysis.repository.UserPreprocessingSettingRepository;
import com.backend.model.entity.HealthDataType;
import com.backend.model.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserPreprocessingSettingServiceImpl implements UserPreprocessingSettingService {
    private final PreprocessingOperationRepository preprocessingOperationRepository;
    private final UserPreprocessingSettingRepository userPreprocessingSettingRepository;

    @Override
    @Transactional(readOnly = true)
    public List<UserPreprocessingSettingDTO> getCurrentUserSettings(User user, HealthDataType dataType) {
        return userPreprocessingSettingRepository.findByOwnerIdAndDataTypeOrderByDisplayOrderAsc(user.getId(), dataType)
                .stream()
                .map(setting -> {
                    UserPreprocessingSettingDTO dto = new UserPreprocessingSettingDTO();
                    dto.setOperationName(setting.getOperationName());
                    dto.setOperationCode(setting.getOperationCode());
                    dto.setDisplayOrder(setting.getDisplayOrder());
                    dto.setActive(setting.isActive());
                    dto.setParameters(setting.getParameters());
                    return dto;
                })
                .toList();
    }

    @Override
    @Transactional
    public List<UserPreprocessingSettingDTO> saveCurrentUserSettings(
            User user,
            HealthDataType dataType,
            List<UserPreprocessingSettingDTO> settings
    ) {
        if (settings == null) {
            return getCurrentUserSettings(user, dataType);
        }

        int defaultDisplayOrder = 1;

        for (UserPreprocessingSettingDTO dto : settings) {
            if (dto == null || dto.getOperationCode() == null || dto.getOperationCode().isBlank()) {
                continue;
            }

            PreprocessingOperation operation = preprocessingOperationRepository
                    .findByDataTypeAndOperationCode(dataType, dto.getOperationCode())
                    .orElseThrow(() -> new IllegalArgumentException("Unknown preprocessing operation: " + dto.getOperationCode()));

            UserPreprocessingSetting setting = userPreprocessingSettingRepository
                    .findByOwnerIdAndDataTypeAndOperationCode(user.getId(), dataType, dto.getOperationCode())
                    .orElseGet(UserPreprocessingSetting::new);

            setting.setOwner(user);
            setting.setDataType(dataType);
            setting.setOperation(operation);
            setting.setOperationName(operation.getOperationName());
            setting.setOperationCode(operation.getOperationCode());
            setting.setDisplayOrder(dto.getDisplayOrder() != null ? dto.getDisplayOrder() : defaultDisplayOrder);
            setting.setActive(dto.isActive());

            Map<String, Object> parameters = dto.getParameters() != null
                    ? new LinkedHashMap<>(dto.getParameters())
                    : new LinkedHashMap<>(operation.getDefaultParameters());
            setting.setParameters(parameters);

            userPreprocessingSettingRepository.save(setting);
            defaultDisplayOrder += 1;
        }

        return getCurrentUserSettings(user, dataType);
    }
}
