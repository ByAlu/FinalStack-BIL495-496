package com.backend.auth;

import com.backend.exception.auth.UserAlreadyExistsException;
import com.backend.model.dto.ChangePasswordRequest;
import com.backend.model.dto.LoginRequest;
import com.backend.model.dto.RegisterRequest;
import com.backend.model.entity.HealthDataType;
import com.backend.model.entity.Role;
import com.backend.model.entity.User;
import com.backend.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SecurityService {
    private static final String PASSWORD_RULE_MESSAGE =
            "New password must be at least 8 characters long and include both letters and numbers.";

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private PasswordEncoder passwordEncoder;

    public String login(LoginRequest request) {
        var user = userRepository.findByUserName(request.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found!"));

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        return jwtService.generateToken(user);
    }
    public String register(RegisterRequest request) {
        if (userRepository.findByUserName(request.getUsername()).isPresent()) {
            throw new UserAlreadyExistsException("This username is already taken, please select new username!");
        }
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new UserAlreadyExistsException("This email is already taken, please select new email!");
        }
        var user = new User();
        user.setUserName(request.getUsername());
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setRole(request.getRole());
        user.setAllowedDataTypes(resolveAllowedDataTypes(request));

        // Şifreyi asla açık metin kaydetmiyoruz!
        user.setHashedSaltedPassword(passwordEncoder.encode(request.getPassword()));

        userRepository.save(user);
        return jwtService.generateToken(user);
    }

    public void changePassword(User user, ChangePasswordRequest request) {
        if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            throw new IllegalArgumentException("Current password is required.");
        }
        if (request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new IllegalArgumentException("New password is required.");
        }
        if (request.getConfirmNewPassword() == null || request.getConfirmNewPassword().isBlank()) {
            throw new IllegalArgumentException("Password confirmation is required.");
        }
        if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            throw new IllegalArgumentException("New password and confirmation do not match.");
        }
        if (!isPasswordStrong(request.getNewPassword())) {
            throw new IllegalArgumentException(PASSWORD_RULE_MESSAGE);
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getHashedSaltedPassword())) {
            throw new BadCredentialsException("Current password is incorrect.");
        }

        user.setHashedSaltedPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    private Set<HealthDataType> resolveAllowedDataTypes(RegisterRequest request) {
        List<HealthDataType> requestedDataTypes = request.getAllowedDataTypes();
        if (requestedDataTypes != null && !requestedDataTypes.isEmpty()) {
            return EnumSet.copyOf(requestedDataTypes);
        }
        if (request.getRole() == Role.ADMIN) {
            return EnumSet.allOf(HealthDataType.class);
        }
        return EnumSet.of(HealthDataType.ULTRASOUND);
    }

    private boolean isPasswordStrong(String password) {
        if (password == null || password.length() < 8) {
            return false;
        }

        boolean hasLetter = false;
        boolean hasDigit = false;

        for (char character : password.toCharArray()) {
            if (Character.isLetter(character)) {
                hasLetter = true;
            } else if (Character.isDigit(character)) {
                hasDigit = true;
            }
        }

        return hasLetter && hasDigit;
    }
}
