package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiModuleOptionDTO;
import com.backend.ai.analysis.model.entity.UsAiModule;
import com.backend.ai.analysis.repository.UsAiModuleRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AiModuleCatalogServiceImpl implements AiModuleCatalogService {

    private final UsAiModuleRepository usAiModuleRepository;

    public AiModuleCatalogServiceImpl(UsAiModuleRepository usAiModuleRepository) {
        this.usAiModuleRepository = usAiModuleRepository;
    }

    @Override
    public List<AiModuleOptionDTO> getAvailableModules() {
        return usAiModuleRepository.findByActiveTrueOrderByDisplayNameAsc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    private AiModuleOptionDTO toDto(UsAiModule module) {
        return new AiModuleOptionDTO(
                module.getModuleCode(),
                toFrontendModuleId(module.getModuleCode()),
                module.getDisplayName(),
                module.getDescription()
        );
    }

    private String toFrontendModuleId(String moduleCode) {
        return switch (moduleCode) {
            case "B_LINE_DETECTION" -> "b-line";
            case "RDS_SCORING" -> "rds-score";
            default -> moduleCode.toLowerCase().replace('_', '-');
        };
    }
}
