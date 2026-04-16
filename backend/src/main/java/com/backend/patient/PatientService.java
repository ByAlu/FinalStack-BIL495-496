package com.backend.patient;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.backend.exception.datamanagment.PatientNotFoundException;
import com.backend.patient.PatientRepository;

import java.util.Comparator;
import java.util.List;


@Service
@RequiredArgsConstructor
public class PatientService {
    private final PatientRepository patientRepository;

    public List<PatientDTO> getAllPatients() {
        return patientRepository.findAll().stream()
                .sorted(Comparator.comparing(Patient::getId))
                .map(this::toDto)
                .toList();
    }

    public PatientDTO getPatientById(Long patientId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new PatientNotFoundException("Patient not found with id: " + patientId));

        return toDto(patient);
    }

    private PatientDTO toDto(Patient patient) {
        return new PatientDTO(
                "PT-"+patient.getId(),
                patient.getName(),
                patient.getAge()
        );
    }
}