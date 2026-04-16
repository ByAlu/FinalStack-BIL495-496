package com.backend.cloud.service;

import com.backend.datamanagment.model.ExaminationDTO;
import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.dto.GCSPage;
import com.backend.model.dto.UploadUrlResponseDTO;
import com.backend.model.entity.UsExaminationRegion;
import com.google.cloud.storage.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.StreamSupport;

@Service
public class GCSStorageService implements CloudService {
    @Autowired
    private final Storage storage;

    @Value("${gcp.storage.bucket-name}")
    private String bucketName;

    public GCSStorageService(Storage storage) {
        this.storage = storage;
    }

    @Override
    public Page<ExaminationVideoDTO> getExaminationVideoDTO(String url, Pageable pageable) {
        return null;
    }

    @Override
    public UploadUrlResponseDTO generateBulkUploadUrls(Long patientId, String examName, List<UsExaminationRegion> regions) {
        List<UploadUrlResponseDTO.UploadTarget> targets = new ArrayList<>();

        // 3. Her bir bölge (R1, R2 vb.) için döngüye giriyoruz
        for (UsExaminationRegion region : regions) {
            // Profesyonel yol formatımız: ai/PT_1001/EX_123/R1.mp4
            String cloudPath = String.format("ai/PT_%d/%s/%s.jpg", patientId, examName, region.name());

            // GCS'ten bu dosya yolu için 15 dakikalık YÜKLEME (PUT) izni alıyoruz
            // (Yükleme linkleri genellikle kısa süreli tutulur)
            String signedUploadUrl = this.generateV4PutObjectSignedUrl(cloudPath);

            // Target objesini listeye ekle
            targets.add(new UploadUrlResponseDTO.UploadTarget(region, signedUploadUrl));
        }


        // 4. Sonuçları paketleyip frontend'e fırlatıyoruz
        return new UploadUrlResponseDTO(examName, targets);

    }
    public String generateV4PutObjectSignedUrl(String cloudPath) {
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, cloudPath))
                        .setContentType("image/jpeg")
                        .build();

        // Dikkat: HttpMethod.PUT ve yazma izni!
        URL url = storage.signUrl(blobInfo, 15, TimeUnit.MINUTES,
                Storage.SignUrlOption.httpMethod(HttpMethod.PUT),
                Storage.SignUrlOption.withV4Signature(),
                Storage.SignUrlOption.withContentType());

        return url.toString();
    }

    @Override
    public com.google.api.gax.paging.Page<Blob> listFilesWithPagination(String folderPrefix, int pageSize, String pageToken) {
        // folderPrefix: "patient-123/" gibi olmalı
        Storage.BlobListOption options = Storage.BlobListOption.prefix("ai/"+folderPrefix);
        System.out.println(options);

        if(pageToken == null) {
            return storage.list(bucketName,
                    options,
                    Storage.BlobListOption.pageSize(pageSize));
        }
        return storage.list(bucketName,
                options,
                Storage.BlobListOption.pageSize(pageSize),
                Storage.BlobListOption.pageToken(pageToken));
    }

    @Override
    public String generateV4GetObjectSignedUrl(String cloudPath) {
        // 1. Bucket ve dosya yolunu (path) tanımlıyoruz
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, cloudPath)).build();

        // 2. 60 dakikalık, sadece OKUMA (GET) izni veren imzalı URL üretiyoruz
        // V4 Signature, Google Cloud'un en güncel ve güvenli imzalama yöntemidir.
        URL url = storage.signUrl(blobInfo, 60, TimeUnit.MINUTES,
                Storage.SignUrlOption.httpMethod(HttpMethod.GET),
                Storage.SignUrlOption.withV4Signature());

        // 3. URL'i String olarak döndürüyoruz
        return url.toString();
    }


    @Override
    public List<ExaminationVideoDTO> getExaminationVideoDTO(Long patientId, String examName) {
        // Klasör yolu görsele göre: ai/PT_1001/EX_123/
        String folderPrefix = String.format("ai/PT_%d/%s/", patientId, examName);

        // GCS'teki dosyaları listele
        Iterable<Blob> blobs = storage.list(bucketName, Storage.BlobListOption.prefix(folderPrefix)).iterateAll();

        List<ExaminationVideoDTO> dtoList = new ArrayList<>();

        for (Blob blob : blobs) {
            // Sadece MP4 dosyalarını al (Görselde mp4 görünüyor)
            if (blob.getName().endsWith(".mp4")) {

                // Dosya adından Region'ı çek (R1, R2 vb.)
                String fileName = blob.getName().substring(blob.getName().lastIndexOf("/") + 1);
                String regionStr = fileName.substring(0, fileName.lastIndexOf(".")); // "R1"

                // İmzalı İZLEME linki üret
                String signedUrl = this.generateV4GetObjectSignedUrl(blob.getName());

                // DTO'yu doldur
                ExaminationVideoDTO dto = new ExaminationVideoDTO(patientId, UsExaminationRegion.valueOf(regionStr));
                dto.setPatientId(patientId);
                dto.setExaminationName(examName);
                dto.setUrl(signedUrl);
                dto.setFileSize(blob.getSize());
                dto.setUploadDate(blob.getUpdateTimeOffsetDateTime().toLocalDateTime());
                dto.setRegion(UsExaminationRegion.valueOf(regionStr));

                dtoList.add(dto);
            }
        }
        return dtoList;

    }

    @Override
    public GCSPage<ExaminationDTO> getExaminationsByPatientId(Long patientId, int size, String token) {
        size=size+1;
        String prefix = "ai/PT_" + patientId + "/";

        List<Storage.BlobListOption> options = new ArrayList<>();
        options.add(Storage.BlobListOption.prefix(prefix));
        options.add(Storage.BlobListOption.currentDirectory()); // delimiter("/") otomatik eklenir
        options.add(Storage.BlobListOption.pageSize(size)); // 20 adet donsun

        if (token != null && !token.trim().isEmpty()) {
            options.add(Storage.BlobListOption.pageToken(token));
        }

        // 1. GCS'den ham sayfayı çek
        com.google.api.gax.paging.Page<Blob> blobPage = storage.list(bucketName, options.toArray(new Storage.BlobListOption[0]));

        // 2. Klasör isimlerini ayıkla ve DTO'ya map'le
        // Not: GCS klasör listelerken boş Blob nesneleri veya prefixler döner
        List<ExaminationDTO> dtoList = StreamSupport.stream(blobPage.getValues().spliterator(), false)
                .map(Blob::getName)
                .map(fullName -> {
                    String cleaned = fullName.endsWith("/") ? fullName.substring(0, fullName.length() - 1) : fullName;
                    String[] pathParts = cleaned.split("/");
                    return pathParts[pathParts.length - 1];
                })
                .filter(folderName -> folderName.contains("_EX_"))
                .map(this::mapFolderToDTO)
                // GCS'den gelen veriyi sayfa içinde tekrar sıralayalım
                .sorted(Comparator.comparing(ExaminationDTO::getExaminationDate).reversed())
                .toList();

        // 3. Kendi GCSPage objemizi dönelim (içinde içerik ve sonraki sayfa token'ı olsun)
        return new GCSPage<>(dtoList, blobPage.getNextPageToken());
    }

    private ExaminationDTO mapFolderToDTO(String folderName) {
        // 1. Klasör ismini parçala: "1713264463_EX_133"
        String[] parts = folderName.split("_EX_");

        long unixTime = Long.parseLong(parts[0]); // İlk 10 hane: 1713264463
        String exId = parts.length > 1 ? "EX_" + parts[1] : "Unknown Examination";

        ExaminationDTO dto = new ExaminationDTO();
        dto.setExaminationDate(LocalDateTime.ofInstant(Instant.ofEpochSecond(unixTime), ZoneId.systemDefault()));
        dto.setExaminationName(exId);
        dto.setTimeAndExamName(folderName);

        return dto;
    }

    @Override
    public Storage getStorage() {
        return this.storage;
    }
}
