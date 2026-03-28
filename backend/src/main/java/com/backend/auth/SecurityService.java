package com.backend.auth;

import com.backend.model.dto.LoginRequest;
import com.backend.model.dto.RegisterRequest;
import com.backend.model.entity.User;
import com.backend.model.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SecurityService {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private PasswordEncoder passwordEncoder;

    public String login(LoginRequest request) {
        // Check user credentials
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        // 2. Adım: Kullanıcıyı bul
        var user = userRepository.findByUserName(request.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found!"));

        // 3. Adım: Token Üret ve Gönder
        return jwtService.generateToken(user);
    }
    public String register(RegisterRequest request) {
        if (userRepository.findByUserName(request.getUsername()).isPresent()) {
            throw new RuntimeException("This username is already taken, please select new username!");
        }
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("This email is already taken, please select new email!");
        }
        var user = new User();
        user.setUserName(request.getUsername());
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());

        // Şifreyi asla açık metin kaydetmiyoruz!
        user.setHashedSaltedPassword(passwordEncoder.encode(request.getPassword()));

        userRepository.save(user);
        return jwtService.generateToken(user);
    }
}
