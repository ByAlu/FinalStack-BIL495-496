package com.backend.datamanagment.list.controller;

import com.backend.datamanagment.list.service.PatientListService;
import com.backend.model.dto.PatientDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/patients")
public class PatientListController {
    @Autowired
    PatientListService service;

    @GetMapping()
    public ResponseEntity<Page<PatientDTO>> getPatientsByName
            (@RequestParam(required = false, defaultValue = "") String name,
             Pageable pageable)
    {
        return ResponseEntity.ok(service.searchPatientByName(name, pageable));
    }
    @GetMapping("/{id}")
    public ResponseEntity<PatientDTO> getPatientsById(@PathVariable Long id){
        return ResponseEntity.ok(service.getPatientById(id));
    }
}
