package com.backend.storage.model.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
public class FileMetadata {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String fileName;

    private String storageKey; //could be used as foreign key, if there is in cloud

    private String fileType;

    private Long fileSize;

    @Column(nullable = false)
    private String url;

    private LocalDateTime uploadDate;

    @PrePersist
    void onCreate(){
        this.uploadDate=LocalDateTime.now();
    }
}
