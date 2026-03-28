package com.backend.model.mapper;

import com.backend.model.dto.PatientDTO;
import com.backend.model.dto.UserDTO;
import com.backend.model.entity.Patient;
import com.backend.model.entity.PatientExamination;
import com.backend.model.entity.User;
import com.backend.model.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;

public class PatientMapper {
    PatientRepository patientRepository;
    public static PatientDTO toDTO(Patient patient, List<Long> patientExaminationIds) {
        if (patient == null) {
            return null;
        }
        PatientDTO patientDTO = new PatientDTO();
        patientDTO.setName(patient.getName());
        patientDTO.setId(patient.getId());
        patientDTO.setExaminationIds(patientExaminationIds);
        return patientDTO;
    }

    public static Patient toEntity(PatientDTO dto) {
        if (dto == null) {
            return null;
        }
        Patient patient = new Patient();
        patient.setId(dto.getId());
        patient.setName(dto.getName());
        return patient;
    }
}
