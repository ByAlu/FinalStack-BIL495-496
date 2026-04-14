package com.backend.model.controller;

import com.backend.auth.SecurityService;
import com.backend.model.dto.AdminUserCreateRequest;
import com.backend.model.dto.AdminUserUpdateRequest;
import com.backend.model.dto.ChangePasswordRequest;
import com.backend.model.dto.UserDTO;
import com.backend.model.entity.User;
import com.backend.model.mapper.UserMapper;
import com.backend.model.service.AdminUserManagementService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {
    private final SecurityService securityService;
    private final AdminUserManagementService adminUserManagementService;

    public UserController(SecurityService securityService, AdminUserManagementService adminUserManagementService) {
        this.securityService = securityService;
        this.adminUserManagementService = adminUserManagementService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(UserMapper.toDTO(user));
    }

    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(adminUserManagementService.getAllUsers(user));
    }

    @PostMapping
    public ResponseEntity<UserDTO> createUser(
            @AuthenticationPrincipal User user,
            @RequestBody AdminUserCreateRequest request
    ) {
        return ResponseEntity.ok(adminUserManagementService.createUser(user, request));
    }

    @PutMapping("/{userId}")
    public ResponseEntity<UserDTO> updateUser(
            @AuthenticationPrincipal User user,
            @PathVariable Long userId,
            @RequestBody AdminUserUpdateRequest request
    ) {
        return ResponseEntity.ok(adminUserManagementService.updateUser(user, userId, request));
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
