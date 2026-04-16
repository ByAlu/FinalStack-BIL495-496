package com.backend.patient;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class PatientDTO {
    private String id;
    private String name;
    private Integer age;
}