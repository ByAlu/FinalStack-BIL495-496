package com.backend.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
public class User implements UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String userName;

    @Column(nullable = false)//Note: salted, ensures unique
    private String hashedSaltedPassword;

    @Column(unique = true,nullable = false)
    private String email;

    private String firstName;
    private String lastName;

    @Enumerated(EnumType.STRING)
    private Role role;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_allowed_data_types", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "data_type", nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    private Set<HealthDataType> allowedDataTypes = EnumSet.noneOf(HealthDataType.class);

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(updatable = false)
    LocalDateTime createTime;

    private LocalDateTime updateTime;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createTime = now;
        this.updateTime = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updateTime = LocalDateTime.now();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        List<SimpleGrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_" + role.name()));
        allowedDataTypes.forEach(dataType -> authorities.add(new SimpleGrantedAuthority("DATA_TYPE_" + dataType.name())));
        return authorities;
    }

    @Override
    public String getPassword() {
        return this.hashedSaltedPassword;
    }

    @Override
    public String getUsername() {
        return this.userName;
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() { return true; }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return enabled; }

    public boolean hasAccessTo(HealthDataType dataType) {
        return allowedDataTypes.contains(dataType);
    }

}
