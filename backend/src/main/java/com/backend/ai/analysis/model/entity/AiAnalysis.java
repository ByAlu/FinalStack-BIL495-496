package com.backend.ai.analysis.model.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Getter @Setter
public class AiAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID analysisUuid;

    @OneToMany(mappedBy = "aiAnalysis", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<DoctorSuggestion> suggestions = new ArrayList<>();

    private Long patientId;
    private String examinationName;

    @Enumerated(EnumType.STRING)
    private AnalysisStatus status;

    @JdbcTypeCode(SqlTypes.JSON) // Hibernate 6+ ile gelen modern yöntem
    private Map<String, Object> resultData;
}
