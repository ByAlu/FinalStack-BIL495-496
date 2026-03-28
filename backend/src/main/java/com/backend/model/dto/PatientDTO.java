package com.backend.model.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class PatientDTO {
    private Long id;
    private String name;
    private List<Long> examinationIds;
}
