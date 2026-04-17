package com.backend.auth;

import com.backend.exception.auth.UserAlreadyExistsException;
import com.backend.model.dto.ChangePasswordRequest;
import com.backend.model.dto.LoginRequest;
import com.backend.model.dto.RegisterRequest;
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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.EnumSet;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SecurityServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private SecurityService securityService;

    @Captor
    private ArgumentCaptor<User> userCaptor;

    @Test
    void tc01_loginWithValidDoctorCredentials_returnsJwtToken() {
        LoginRequest request = new LoginRequest();
        request.setUsername("doctor");
        request.setPassword("doctor123");

        User doctor = createUser(1L, "doctor", "doctor@example.com", Role.DOCTOR);

        when(userRepository.findByUserName("doctor")).thenReturn(Optional.of(doctor));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("doctor", null));
        when(jwtService.generateToken(doctor)).thenReturn("doctor-jwt-token");

        String token = securityService.login(request);

        assertEquals("doctor-jwt-token", token);
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
        verify(jwtService).generateToken(doctor);
    }

    @Test
    void tc02_loginWithWrongPassword_throwsBadCredentialsException() {
        LoginRequest request = new LoginRequest();
        request.setUsername("doctor");
        request.setPassword("wrong-password");

        User doctor = createUser(1L, "doctor", "doctor@example.com", Role.DOCTOR);

        when(userRepository.findByUserName("doctor")).thenReturn(Optional.of(doctor));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThrows(BadCredentialsException.class, () -> securityService.login(request));
        verify(jwtService, never()).generateToken(any(User.class));
    }

    @Test
    void tc03_loginWithValidAdminCredentials_returnsJwtToken() {
        LoginRequest request = new LoginRequest();
        request.setUsername("admin");
        request.setPassword("admin123");

        User admin = createUser(2L, "admin", "admin@example.com", Role.ADMIN);
        admin.setAllowedDataTypes(EnumSet.allOf(HealthDataType.class));

        when(userRepository.findByUserName("admin")).thenReturn(Optional.of(admin));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("admin", null));
        when(jwtService.generateToken(admin)).thenReturn("admin-jwt-token");

        String token = securityService.login(request);

        assertEquals("admin-jwt-token", token);
        verify(jwtService).generateToken(admin);
    }

    @Test
    void loginWithUnknownUser_throwsUsernameNotFoundException() {
        LoginRequest request = new LoginRequest();
        request.setUsername("missing");
        request.setPassword("whatever123");

        when(userRepository.findByUserName("missing")).thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class, () -> securityService.login(request));
    }

    @Test
    void registerWithDuplicateUsername_throwsUserAlreadyExistsException() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("doctor");
        request.setPassword("Strong123");
        request.setEmail("newdoctor@example.com");
        request.setRole(Role.DOCTOR);

        when(userRepository.findByUserName("doctor"))
                .thenReturn(Optional.of(createUser(10L, "doctor", "doctor@example.com", Role.DOCTOR)));

        assertThrows(UserAlreadyExistsException.class, () -> securityService.register(request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registerWithAdminRoleAndNoExplicitAllowedDataTypes_assignsAllDataTypes() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("newadmin");
        request.setPassword("Strong123");
        request.setEmail("admin@example.com");
        request.setFirstName("Ada");
        request.setLastName("Min");
        request.setRole(Role.ADMIN);

        when(userRepository.findByUserName("newadmin")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Strong123")).thenReturn("encoded-password");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwtService.generateToken(any(User.class))).thenReturn("generated-admin-token");

        String token = securityService.register(request);

        assertEquals("generated-admin-token", token);
        verify(userRepository).save(userCaptor.capture());

        User savedUser = userCaptor.getValue();
        assertEquals("newadmin", savedUser.getUsername());
        assertEquals("admin@example.com", savedUser.getEmail());
        assertEquals(Role.ADMIN, savedUser.getRole());
        assertEquals(EnumSet.allOf(HealthDataType.class), savedUser.getAllowedDataTypes());
        assertEquals("encoded-password", savedUser.getHashedSaltedPassword());
    }

    @Test
    void changePasswordWithMismatchedConfirmation_throwsIllegalArgumentException() {
        User user = createUser(1L, "doctor", "doctor@example.com", Role.DOCTOR);
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("OldPass123");
        request.setNewPassword("NewPass123");
        request.setConfirmNewPassword("Different123");

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> securityService.changePassword(user, request)
        );

        assertEquals("New password and confirmation do not match.", exception.getMessage());
    }

    @Test
    void changePasswordWithWrongCurrentPassword_throwsBadCredentialsException() {
        User user = createUser(1L, "doctor", "doctor@example.com", Role.DOCTOR);
        user.setHashedSaltedPassword("encoded-old-password");

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("WrongOld123");
        request.setNewPassword("NewPass123");
        request.setConfirmNewPassword("NewPass123");

        when(passwordEncoder.matches("WrongOld123", "encoded-old-password")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> securityService.changePassword(user, request));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void changePasswordWithValidRequest_updatesStoredPassword() {
        User user = createUser(1L, "doctor", "doctor@example.com", Role.DOCTOR);
        user.setHashedSaltedPassword("encoded-old-password");

        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("OldPass123");
        request.setNewPassword("NewPass123");
        request.setConfirmNewPassword("NewPass123");

        when(passwordEncoder.matches("OldPass123", "encoded-old-password")).thenReturn(true);
        when(passwordEncoder.encode("NewPass123")).thenReturn("encoded-new-password");

        securityService.changePassword(user, request);

        assertEquals("encoded-new-password", user.getHashedSaltedPassword());
        verify(userRepository).save(user);
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
