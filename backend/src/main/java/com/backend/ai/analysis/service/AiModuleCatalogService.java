package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiModuleOptionDTO;

import java.util.List;

public interface AiModuleCatalogService {
    List<AiModuleOptionDTO> getAvailableModules();
}
