package com.backend.model.controller;

import com.backend.auth.SecurityService;
import com.backend.model.dto.ChangePasswordRequest;
import com.backend.model.dto.UserDTO;
import com.backend.model.entity.User;
import com.backend.model.mapper.UserMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    private final SecurityService securityService;

    public UserController(SecurityService securityService) {
        this.securityService = securityService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(UserMapper.toDTO(user));
    }

    @PostMapping("/me/change-password")
    public ResponseEntity<Void> changePassword(
            @AuthenticationPrincipal User user,
            @RequestBody ChangePasswordRequest request
    ) {
        securityService.changePassword(user, request);
        return ResponseEntity.noContent().build();
    }
}
