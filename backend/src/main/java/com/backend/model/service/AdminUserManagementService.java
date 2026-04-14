package com.backend.model.service;

import com.backend.exception.auth.UserAlreadyExistsException;
import com.backend.model.dto.AdminUserCreateRequest;
import com.backend.model.dto.AdminUserUpdateRequest;
import com.backend.model.dto.UserDTO;
import com.backend.model.entity.HealthDataType;
import com.backend.model.entity.Role;
import com.backend.model.entity.User;
import com.backend.model.mapper.UserMapper;
import com.backend.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminUserManagementService {
    private static final String PASSWORD_RULE_MESSAGE =
            "New password must be at least 8 characters long and include both letters and numbers.";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserDTO> getAllUsers(User actingUser) {
        ensureAdmin(actingUser);

        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getId))
                .map(UserMapper::toDTO)
                .toList();
    }

    public UserDTO createUser(User actingUser, AdminUserCreateRequest request) {
        ensureAdmin(actingUser);
        validateRequiredPassword(request.getPassword());

        User user = new User();
        applyCommonFields(
                user,
                request.getUsername(),
                request.getEmail(),
                request.getFirstName(),
                request.getLastName(),
                request.getPhoneNumber(),
                request.getRole(),
                request.getAllowedDataTypes(),
                request.getEnabled()
        );
        user.setHashedSaltedPassword(passwordEncoder.encode(request.getPassword()));

        return UserMapper.toDTO(userRepository.save(user));
    }

    public UserDTO updateUser(User actingUser, Long userId, AdminUserUpdateRequest request) {
        ensureAdmin(actingUser);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found."));

        applyCommonFields(
                user,
                request.getUsername(),
                request.getEmail(),
                request.getFirstName(),
                request.getLastName(),
                request.getPhoneNumber(),
                request.getRole(),
                request.getAllowedDataTypes(),
                request.getEnabled()
        );

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            validateStrongPassword(request.getPassword());
            user.setHashedSaltedPassword(passwordEncoder.encode(request.getPassword()));
        }

        return UserMapper.toDTO(userRepository.save(user));
    }

    private void applyCommonFields(
            User user,
            String username,
            String email,
            String firstName,
            String lastName,
            String phoneNumber,
            Role role,
            List<HealthDataType> allowedDataTypes,
            Boolean enabled
    ) {
        validateRequiredFields(username, email, role);
        ensureUniqueUsername(username, user.getId());
        ensureUniqueEmail(email, user.getId());

        user.setUserName(username.trim());
        user.setEmail(email.trim());
        user.setFirstName(normalizeOptional(firstName));
        user.setLastName(normalizeOptional(lastName));
        user.setPhoneNumber(normalizeOptional(phoneNumber));
        user.setRole(role);
        user.setAllowedDataTypes(resolveAllowedDataTypes(allowedDataTypes, role));
        user.setEnabled(enabled == null || enabled);
    }

    private void validateRequiredFields(String username, String email, Role role) {
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Username is required.");
        }
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required.");
        }
        if (role == null) {
            throw new IllegalArgumentException("Role is required.");
        }
    }

    private void validateRequiredPassword(String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required.");
        }
        validateStrongPassword(password);
    }

    private void validateStrongPassword(String password) {
        if (!isPasswordStrong(password)) {
            throw new IllegalArgumentException(PASSWORD_RULE_MESSAGE);
        }
    }

    private void ensureUniqueUsername(String username, Long currentUserId) {
        userRepository.findByUserName(username.trim()).ifPresent(existingUser -> {
            if (currentUserId == null || !existingUser.getId().equals(currentUserId)) {
                throw new UserAlreadyExistsException("This username is already taken, please select new username!");
            }
        });
    }

    private void ensureUniqueEmail(String email, Long currentUserId) {
        userRepository.findByEmail(email.trim()).ifPresent(existingUser -> {
            if (currentUserId == null || !existingUser.getId().equals(currentUserId)) {
                throw new UserAlreadyExistsException("This email is already taken, please select new email!");
            }
        });
    }

    private Set<HealthDataType> resolveAllowedDataTypes(List<HealthDataType> requestedDataTypes, Role role) {
        if (requestedDataTypes != null && !requestedDataTypes.isEmpty()) {
            return EnumSet.copyOf(requestedDataTypes);
        }
        if (role == Role.ADMIN) {
            return EnumSet.allOf(HealthDataType.class);
        }
        return EnumSet.of(HealthDataType.ULTRASOUND);
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void ensureAdmin(User actingUser) {
        if (actingUser == null || actingUser.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Admin access is required.");
        }
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
