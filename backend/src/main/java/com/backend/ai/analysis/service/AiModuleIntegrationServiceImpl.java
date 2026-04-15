package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.AiAnalysisDTO;
import com.backend.ai.analysis.model.dto.AiAnalysisResultDTO;
import com.backend.ai.analysis.model.entity.AnalysisStatus;
import com.backend.ai.analysis.model.entity.AnalysisTarget;
import com.backend.ai.analysis.model.entity.AnalysisRequest;
import com.backend.ai.analysis.model.entity.UsAiAnalysis;
import com.backend.ai.analysis.model.entity.UsAnalysisModuleRun;
import com.backend.ai.analysis.repository.UsAiAnalysisRepository;
import com.google.api.client.util.Value;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.UUID;
import java.util.Map;

@Service
public class AiModuleIntegrationServiceImpl implements AiModuleIntegrationService {
    @Value("${api.callback.url}")
    private String callbackUrl;
    @Value("${api.url}")
    private String apiUrl;

    @Autowired
    private UsAiAnalysisRepository aiAnalysisRepository;
    @Autowired
    private WebClient webClient;
    @Override
    public AiAnalysisDTO analyze(UUID analysisUuid, AnalysisTarget target) {

        System.out.println("🚀 START analyze() for UUID: " + analysisUuid);
        System.out.println("📥 Incoming AnalysisTarget: " + target);

        UsAiAnalysis analysis = aiAnalysisRepository.findById(analysisUuid)
            .orElseThrow();

        System.out.println(analysis+"HEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEERE");

        for (UsAnalysisModuleRun run : analysis.getModuleRuns()) {

            String moduleCode = run.getAiModule().getModuleCode();

            System.out.println(moduleCode+"HEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEERE");

            if (!run.getAiModule().isActive()) {
                continue;
            }

            AnalysisRequest req = new AnalysisRequest();

            //TODO: Get the url from gcs
            req.setImageUrl("http://your-image-url");
            req.setCallbackUrl(callbackUrl);
            req.setAnalysisTarget(target);

            System.out.println("📤 Sending request to FastAPI:");
            System.out.println("   URL: " + apiUrl + "/analyze");
            System.out.println("   Image: " + req.getImageUrl());
            System.out.println("   Callback: " + req.getCallbackUrl());
            System.out.println("   Target: " + req.getAnalysisTarget());
            try {
                //Python request response
                Map<String, Object> response = webClient.post()
                                                .uri(apiUrl + "/analyze")
                                                .bodyValue(req)
                                                .retrieve()
                                                .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                                                .block();

                String jobId = (String) response.get("job_id");

                run.setExternalJobId(jobId);
                run.setStatus(AnalysisStatus.PROCESSING);

                System.out.println("💾 Updated module run status to PROCESSING");
            } catch (Exception e) {
                e.printStackTrace();
            }
            
        }

        aiAnalysisRepository.save(analysis);
        System.out.println("💾 Analysis saved to DB");

        AiAnalysisDTO dto = new AiAnalysisDTO();
        dto.setAnalysisUuid(analysisUuid);
        dto.setAnalysisStatus(AnalysisStatus.PROCESSING);
        System.out.println("🎯 Returning DTO with status PROCESSING");
        System.out.print(dto);

        return dto;
    }

    @Override
    public AiAnalysisResultDTO getAnalysis(UUID analysisUuid) {
        UsAiAnalysis entity = aiAnalysisRepository.findById(analysisUuid)
                .orElseThrow(() -> new EntityNotFoundException("Analiz bulunamadı: " + analysisUuid));
        AiAnalysisResultDTO dto = new AiAnalysisResultDTO();
        dto.setAnalysisUuid(entity.getAnalysisUuid());
        dto.setStatus(entity.getStatus());

        if (entity.getStatus() == AnalysisStatus.COMPLETED) {
            dto.setResultData(entity.getResultData());
        }

        return dto;
    }
}
