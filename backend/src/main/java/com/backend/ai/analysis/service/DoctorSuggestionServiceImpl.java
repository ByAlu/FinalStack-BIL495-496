package com.backend.ai.analysis.service;

import com.backend.ai.analysis.model.dto.DoctorSuggestionDTO;
import com.backend.ai.analysis.model.entity.DoctorSuggestion;
import com.backend.ai.analysis.model.entity.UsAiAnalysis;
import com.backend.ai.analysis.model.entity.UsAnalysisReport;
import com.backend.ai.analysis.repository.DoctorSuggestionRepository;
import com.backend.ai.analysis.repository.UsAiAnalysisRepository;
import com.backend.ai.analysis.repository.UsAnalysisReportRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
public class DoctorSuggestionServiceImpl implements DoctorSuggestionService {

    private final UsAiAnalysisRepository usAiAnalysisRepository;
    private final UsAnalysisReportRepository usAnalysisReportRepository;
    private final DoctorSuggestionRepository doctorSuggestionRepository;

    public DoctorSuggestionServiceImpl(
            UsAiAnalysisRepository usAiAnalysisRepository,
            UsAnalysisReportRepository usAnalysisReportRepository,
            DoctorSuggestionRepository doctorSuggestionRepository
    ) {
        this.usAiAnalysisRepository = usAiAnalysisRepository;
        this.usAnalysisReportRepository = usAnalysisReportRepository;
        this.doctorSuggestionRepository = doctorSuggestionRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public DoctorSuggestionDTO getByAnalysisUuid(UUID analysisUuid) {
        return usAnalysisReportRepository.findByAnalysisAnalysisUuid(analysisUuid)
                .flatMap(this::resolveDoctorSuggestion)
                .map(this::toDto)
                .orElse(new DoctorSuggestionDTO("", "", ""));
    }

    @Override
    @Transactional
    public DoctorSuggestionDTO saveByAnalysisUuid(UUID analysisUuid, DoctorSuggestionDTO doctorSuggestionDTO) {
        UsAiAnalysis analysis = usAiAnalysisRepository.findById(analysisUuid)
                .orElseThrow(() -> new EntityNotFoundException("Analysis not found: " + analysisUuid));

        UsAnalysisReport report = usAnalysisReportRepository.findByAnalysisAnalysisUuid(analysisUuid)
                .orElseGet(() -> createReport(analysis));

        DoctorSuggestion doctorSuggestion = resolveDoctorSuggestion(report)
                .orElseGet(() -> {
                    DoctorSuggestion createdSuggestion = new DoctorSuggestion();
                    createdSuggestion.setAnalysisReport(report);
                    report.setDoctorSuggestion(createdSuggestion);
                    return createdSuggestion;
                });

        doctorSuggestion.setAnalysisReport(report);
        report.setDoctorSuggestion(doctorSuggestion);
        doctorSuggestion.setFinalDiagnosis(trimToEmpty(doctorSuggestionDTO.getFinalDiagnosis()));
        doctorSuggestion.setTreatmentRecommendation(trimToEmpty(doctorSuggestionDTO.getTreatmentRecommendation()));
        doctorSuggestion.setFollowUpRecommendation(trimToEmpty(doctorSuggestionDTO.getFollowUpRecommendation()));

        DoctorSuggestion savedSuggestion = doctorSuggestionRepository.save(doctorSuggestion);
        usAnalysisReportRepository.save(report);
        return toDto(savedSuggestion);
    }

    private Optional<DoctorSuggestion> resolveDoctorSuggestion(UsAnalysisReport report) {
        if (report == null || report.getId() == null) {
            return Optional.empty();
        }

        if (report.getDoctorSuggestion() != null) {
            return Optional.of(report.getDoctorSuggestion());
        }

        return doctorSuggestionRepository.findByAnalysisReportId(report.getId());
    }

    private UsAnalysisReport createReport(UsAiAnalysis analysis) {
        UsAnalysisReport report = new UsAnalysisReport();
        report.setAnalysis(analysis);
        analysis.setReport(report);
        return usAnalysisReportRepository.save(report);
    }

    private DoctorSuggestionDTO toDto(DoctorSuggestion doctorSuggestion) {
        if (doctorSuggestion == null) {
            return new DoctorSuggestionDTO("", "", "");
        }

        return new DoctorSuggestionDTO(
                trimToEmpty(doctorSuggestion.getFinalDiagnosis()),
                trimToEmpty(doctorSuggestion.getTreatmentRecommendation()),
                trimToEmpty(doctorSuggestion.getFollowUpRecommendation())
        );
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
