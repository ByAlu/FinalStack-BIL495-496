package com.backend.model.service;

import com.backend.exception.auth.UserAlreadyExistsException;
import com.backend.model.dto.AdminUserCreateRequest;
import com.backend.model.dto.AdminUserUpdateRequest;
import com.backend.model.dto.UserDTO;
import com.backend.model.entity.HealthDataType;
import com.backend.model.entity.Role;
import com.backend.model.entity.User;
import com.backend.model.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.EnumSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminUserManagementServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminUserManagementService adminUserManagementService;

    @Captor
    private ArgumentCaptor<User> userCaptor;

    @Test
    void tc25_adminCanListUsers() {
        User actingAdmin = createUser(100L, "admin", "admin@example.com", Role.ADMIN);
        User doctor = createUser(2L, "doctor", "doctor@example.com", Role.DOCTOR);
        User anotherAdmin = createUser(1L, "root", "root@example.com", Role.ADMIN);

        when(userRepository.findAll()).thenReturn(List.of(doctor, anotherAdmin));

        List<UserDTO> result = adminUserManagementService.getAllUsers(actingAdmin);

        assertEquals(2, result.size());
        assertEquals("root", result.get(0).getUserName());
        assertEquals("doctor", result.get(1).getUserName());
    }

    @Test
    void tc26_adminCanCreateNewUser() {
        User actingAdmin = createUser(100L, "admin", "admin@example.com", Role.ADMIN);
        AdminUserCreateRequest request = new AdminUserCreateRequest();
        request.setUsername("newdoctor");
        request.setPassword("Strong123");
        request.setEmail("newdoctor@example.com");
        request.setFirstName("Neo");
        request.setLastName("Doctor");
        request.setPhoneNumber("+905551234567");
        request.setRole(Role.DOCTOR);
        request.setAllowedDataTypes(List.of(HealthDataType.ULTRASOUND));
        request.setEnabled(true);

        when(userRepository.findByUserName("newdoctor")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("newdoctor@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Strong123")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(200L);
            return user;
        });

        UserDTO result = adminUserManagementService.createUser(actingAdmin, request);

        assertEquals("newdoctor", result.getUserName());
        assertEquals("newdoctor@example.com", result.getEmail());
        assertEquals(Role.DOCTOR, result.getRole());
        assertTrue(result.isEnabled());

        verify(userRepository).save(userCaptor.capture());
        User savedUser = userCaptor.getValue();
        assertEquals("encoded-password", savedUser.getHashedSaltedPassword());
        assertEquals("+905551234567", savedUser.getPhoneNumber());
    }

    @Test
    void tc27_adminCanModifyExistingUserSettings() {
        User actingAdmin = createUser(100L, "admin", "admin@example.com", Role.ADMIN);
        User existingUser = createUser(5L, "doctor", "doctor@example.com", Role.DOCTOR);
        existingUser.setFirstName("Old");
        existingUser.setLastName("Name");
        existingUser.setPhoneNumber("+905551111111");
        existingUser.setHashedSaltedPassword("old-encoded-password");

        AdminUserUpdateRequest request = new AdminUserUpdateRequest();
        request.setUsername("doctor");
        request.setPassword("NewPass123");
        request.setEmail("doctor@example.com");
        request.setFirstName("Updated");
        request.setLastName("Doctor");
        request.setPhoneNumber("+905559999999");
        request.setRole(Role.DOCTOR);
        request.setAllowedDataTypes(List.of(HealthDataType.ULTRASOUND, HealthDataType.ECG));
        request.setEnabled(false);

        when(userRepository.findById(5L)).thenReturn(Optional.of(existingUser));
        when(userRepository.findByUserName("doctor")).thenReturn(Optional.of(existingUser));
        when(userRepository.findByEmail("doctor@example.com")).thenReturn(Optional.of(existingUser));
        when(passwordEncoder.encode("NewPass123")).thenReturn("new-encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserDTO result = adminUserManagementService.updateUser(actingAdmin, 5L, request);

        assertEquals("Updated", result.getFirstName());
        assertEquals("Doctor", result.getLastName());
        assertEquals("+905559999999", result.getPhoneNumber());
        assertEquals(Role.DOCTOR, result.getRole());
        assertEquals(EnumSet.of(HealthDataType.ULTRASOUND, HealthDataType.ECG), result.getAllowedDataTypes());
        assertEquals(false, result.isEnabled());
        assertEquals("new-encoded-password", existingUser.getHashedSaltedPassword());
    }

    @Test
    void tc28_nonAdminCannotAccessAdminOperations() {
        User doctor = createUser(10L, "doctor", "doctor@example.com", Role.DOCTOR);
        AdminUserCreateRequest request = new AdminUserCreateRequest();
        request.setUsername("blocked");
        request.setPassword("Strong123");
        request.setEmail("blocked@example.com");
        request.setRole(Role.DOCTOR);

        assertThrows(AccessDeniedException.class, () -> adminUserManagementService.getAllUsers(doctor));
        assertThrows(AccessDeniedException.class, () -> adminUserManagementService.createUser(doctor, request));
        verify(userRepository, never()).findAll();
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void tc29_adminCannotCreateDuplicateUsername() {
        User actingAdmin = createUser(100L, "admin", "admin@example.com", Role.ADMIN);
        AdminUserCreateRequest request = new AdminUserCreateRequest();
        request.setUsername("doctor");
        request.setPassword("Strong123");
        request.setEmail("another@example.com");
        request.setRole(Role.DOCTOR);

        when(userRepository.findByUserName("doctor"))
                .thenReturn(Optional.of(createUser(55L, "doctor", "doctor@example.com", Role.DOCTOR)));

        assertThrows(UserAlreadyExistsException.class, () -> adminUserManagementService.createUser(actingAdmin, request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void updateUserWithUnknownId_throwsUsernameNotFoundException() {
        User actingAdmin = createUser(100L, "admin", "admin@example.com", Role.ADMIN);
        AdminUserUpdateRequest request = new AdminUserUpdateRequest();
        request.setUsername("missing");
        request.setEmail("missing@example.com");
        request.setRole(Role.DOCTOR);

        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(
                UsernameNotFoundException.class,
                () -> adminUserManagementService.updateUser(actingAdmin, 999L, request)
        );
    }

    private User createUser(Long id, String username, String email, Role role) {
        User user = new User();
        user.setId(id);
        user.setUserName(username);
        user.setEmail(email);
        user.setRole(role);
        user.setAllowedDataTypes(role == Role.ADMIN
                ? EnumSet.allOf(HealthDataType.class)
                : EnumSet.of(HealthDataType.ULTRASOUND));
        user.setEnabled(true);
        return user;
    }
}
