package com.backend.datamanagment.model;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ExaminationDTO {
    private String examinationName;
    private LocalDateTime examinationDate;
}
