package com.backend.model.dto;


import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class UserDTO {
    private Long id;

    private String userName;

    private String email;

    private String firstName;
    private String lastName;
    private String phoneNumber;

    LocalDateTime createTime;
}
