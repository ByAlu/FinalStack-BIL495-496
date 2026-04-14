package com.backend.model.dto;


import com.backend.model.entity.HealthDataType;
import com.backend.model.entity.Role;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.Set;

@Getter
@Setter
public class UserDTO {
    private Long id;

    private String userName;

    private String email;

    private String firstName;
    private String lastName;
    private String phoneNumber;
    private Role role;
    private Set<HealthDataType> allowedDataTypes;
    private boolean enabled;

    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
