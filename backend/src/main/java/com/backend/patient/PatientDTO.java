package com.backend.patient;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@AllArgsConstructor
public class PatientDTO {
    private String id;
    private String fullName;
    private LocalDate dateOfBirth;
    private Integer gestationalAgeWeeks;
    private BigDecimal birthWeightKg;
    private Integer postnatalAgeDays;
    private String clinic;
    private String bedNumber;
}