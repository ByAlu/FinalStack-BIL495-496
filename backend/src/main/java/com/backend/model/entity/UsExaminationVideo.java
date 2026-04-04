package com.backend.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "examination_videos")
@Getter
@Setter
// Stores region-specific ultrasound video metadata attached to one ultrasound examination.
public class UsExaminationVideo {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "examination_id", nullable = false)
    private UsExamination examination;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private ExaminationRegion region;

    @Column(length = 2048)
    private String description;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
