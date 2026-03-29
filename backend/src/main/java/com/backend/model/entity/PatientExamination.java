package com.backend.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter
@Setter
public class PatientExamination {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column()
    LocalDate examinationDate;

    @Column(nullable = false)
    ExaminationType examinationType;

    @Column(nullable = false)
    String examinationName;

    @Column(nullable = false)
    private Long patientId;
}
