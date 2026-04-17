package com.backend.ai.analysis.controller;

import com.backend.ai.analysis.model.dto.AiModuleOptionDTO;
import com.backend.ai.analysis.service.AiAnalysisService;
import com.backend.ai.analysis.service.AiModuleCatalogService;
import com.backend.ai.analysis.service.AiModuleIntegrationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AiAnalysisControllerTest {

    @Mock
    private AiAnalysisService aiAnalysisService;

    @Mock
    private AiModuleIntegrationService aiModuleIntegrationService;

    @Mock
    private AiModuleCatalogService aiModuleCatalogService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        AiAnalysisController controller = new AiAnalysisController();
        ReflectionTestUtils.setField(controller, "aiAnalysisService", aiAnalysisService);
        ReflectionTestUtils.setField(controller, "aiModuleIntegrationService", aiModuleIntegrationService);
        ReflectionTestUtils.setField(controller, "aiModuleCatalogService", aiModuleCatalogService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void getAvailableModules_returnsActiveUltrasoundModules() throws Exception {
        when(aiModuleCatalogService.getAvailableModules()).thenReturn(List.of(
                new AiModuleOptionDTO(
                        "B_LINE_DETECTION",
                        "b-line",
                        "B-line Detection",
                        "Detects B-lines across ultrasound lung regions."
                ),
                new AiModuleOptionDTO(
                        "RDS_SCORING",
                        "rds-score",
                        "RDS Scoring",
                        "Scores respiratory distress syndrome findings for ultrasound examinations."
                )
        ));

        mockMvc.perform(get("/api/v1/ai-analysis/modules"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].moduleCode").value("B_LINE_DETECTION"))
                .andExpect(jsonPath("$[0].moduleId").value("b-line"))
                .andExpect(jsonPath("$[0].displayName").value("B-line Detection"))
                .andExpect(jsonPath("$[1].moduleCode").value("RDS_SCORING"))
                .andExpect(jsonPath("$[1].moduleId").value("rds-score"));
    }
}
