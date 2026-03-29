package com.backend.datamanagment.list.service;

import com.backend.exception.datamanagment.PatientNotFoundException;
import com.backend.model.dto.PatientDTO;
import com.backend.model.entity.Patient;
import com.backend.model.entity.PatientExamination;
import com.backend.model.mapper.PatientMapper;
import com.backend.model.repository.PatientExaminationRepository;
import com.backend.model.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PatientListServiceImpl implements PatientListService {

    @Autowired
    PatientRepository patientRepository;
    @Autowired
    PatientExaminationRepository patientExaminationRepository;

    @Override
    public Page<PatientDTO> searchPatientByName(String name, Pageable pageable) {
        // 1. Get patients according to pageable and name
        Page<Patient> patients = patientRepository.findByNameContainingIgnoreCase(name, pageable);

        // Map each patient to PatientDTO, return all
        return patients.map(patient -> {
            List<Long> examIds = patientExaminationRepository.findByPatientId(patient.getId())
                    .stream()
                    .map(PatientExamination::getId)
                    .toList();


            return PatientMapper.toDTO(patient, examIds);
        });
    }

    @Override
    public PatientDTO getPatientById(Long id) {
        // 1.Search for patient
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new PatientNotFoundException("Bu ID ile kayıtlı bir hasta bulunamadı: " + id));

        // 2. Get examination ids for this patient
        List<Long> examIds = patientExaminationRepository.findByPatientId(id)
                .stream()
                .map(PatientExamination::getId)
                .toList();

        return PatientMapper.toDTO(patient, examIds);
    }

    @Override
    public PatientDTO createPatient(PatientDTO patientDTO) {
        Patient patient = PatientMapper.toEntity(patientDTO);
        return PatientMapper.toDTO(patientRepository.save(patient), List.of());
    }
}
