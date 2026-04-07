package com.backend.cloud.service;

import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.dto.UploadUrlResponseDTO;
import com.backend.model.entity.ExaminationRegion;
import com.google.cloud.storage.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

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
    public UploadUrlResponseDTO generateBulkUploadUrls(Long patientId, String examName, List<ExaminationRegion> regions) {
        List<UploadUrlResponseDTO.UploadTarget> targets = new ArrayList<>();

        // 3. Her bir bölge (R1, R2 vb.) için döngüye giriyoruz
        for (ExaminationRegion region : regions) {
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
                        .setContentType("image/jpeg") // İçerik türünü belirtmek önemlidir
                        .build();

        // Dikkat: HttpMethod.PUT ve yazma izni!
        URL url = storage.signUrl(blobInfo, 15, TimeUnit.MINUTES,
                Storage.SignUrlOption.httpMethod(HttpMethod.PUT),
                Storage.SignUrlOption.withV4Signature(),
                Storage.SignUrlOption.withContentType()); // Header desteği önemli

        return url.toString();
    }

    @Override
    public com.google.api.gax.paging.Page<Blob> listFilesWithPagination(String folderPrefix, int pageSize, String pageToken) {
        // folderPrefix: "patient-123/" gibi olmalı
        Storage.BlobListOption options = Storage.BlobListOption.prefix(folderPrefix);

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
                ExaminationVideoDTO dto = new ExaminationVideoDTO(patientId, ExaminationRegion.valueOf(regionStr));
                dto.setPatientId(patientId);
                dto.setExaminationName(examName);
                dto.setUrl(signedUrl);
                dto.setFileSize(blob.getSize());
                dto.setUploadDate(blob.getUpdateTimeOffsetDateTime().toLocalDateTime());
                dto.setRegion(ExaminationRegion.valueOf(regionStr));

                dtoList.add(dto);
            }
        }
        return dtoList;

    }

    @Override
    public Storage getStorage() {
        return this.storage;
    }
}
