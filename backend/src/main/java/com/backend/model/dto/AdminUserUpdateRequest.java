package com.backend.model.dto;

import com.backend.model.entity.HealthDataType;
import com.backend.model.entity.Role;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AdminUserUpdateRequest {
    private String username;
    private String password;
    private String email;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private Role role;
    private List<HealthDataType> allowedDataTypes;
    private Boolean enabled;
}
