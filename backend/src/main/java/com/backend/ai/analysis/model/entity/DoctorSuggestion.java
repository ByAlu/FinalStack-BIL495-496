package com.backend.ai.analysis.model.entity;

import com.backend.model.entity.ExaminationRegion;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Getter @Setter
// Report-owned doctor input for a specific examination region.
public class DoctorSuggestion{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    private ExaminationRegion examinationRegion;

    private Long bLines;
    private Long rdScore;

    private String url;

    @Column(length = 4096)
    private String finalDiagnosis;

    @Column(length = 4096)
    private String treatmentRecommendation;

    @Column(length = 4096)
    private String followUpRecommendation;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_report_id", unique = true)
    private UsAnalysisReport analysisReport;
}
