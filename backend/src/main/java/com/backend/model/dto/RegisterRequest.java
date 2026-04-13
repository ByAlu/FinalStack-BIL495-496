package com.backend.model.dto;

import com.backend.model.entity.HealthDataType;
import com.backend.model.entity.Role;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class RegisterRequest {
    private String username;
    private String password;
    private String email;
    private String firstName;
    private String lastName;
    private Role role;
    private List<HealthDataType> allowedDataTypes;
}
