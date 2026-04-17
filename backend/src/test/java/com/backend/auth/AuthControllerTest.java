package com.backend.auth;

import com.backend.exception.auth.AuthExceptionHandler;
import com.backend.model.dto.LoginRequest;
import com.backend.model.dto.RegisterRequest;
import com.backend.model.entity.Role;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private SecurityService securityService;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        AuthController controller = new AuthController();
        ReflectionTestUtils.setField(controller, "securityService", securityService);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new AuthExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    void tc01_doctorLoginWithValidCredentials_returnsToken() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setUsername("doctor");
        request.setPassword("doctor123");

        when(securityService.login(any(LoginRequest.class))).thenReturn("doctor-jwt-token");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("doctor-jwt-token"));
    }

    @Test
    void tc02_doctorLoginWithInvalidCredentials_returnsUnauthorized() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setUsername("doctor");
        request.setPassword("wrong-password");

        when(securityService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid username or password."));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password."));
    }

    @Test
    void tc03_adminLoginWithValidCredentials_returnsToken() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setUsername("admin");
        request.setPassword("admin123");

        when(securityService.login(any(LoginRequest.class))).thenReturn("admin-jwt-token");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("admin-jwt-token"));
    }

    @Test
    void registerWithDuplicateEmail_returnsConflict() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("newdoctor");
        request.setPassword("Strong123");
        request.setEmail("doctor@example.com");
        request.setFirstName("Neo");
        request.setLastName("Doctor");
        request.setRole(Role.DOCTOR);

        when(securityService.register(any(RegisterRequest.class)))
                .thenThrow(new com.backend.exception.auth.UserAlreadyExistsException(
                        "This email is already taken, please select new email!"
                ));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This email is already taken, please select new email!"));
    }
}
