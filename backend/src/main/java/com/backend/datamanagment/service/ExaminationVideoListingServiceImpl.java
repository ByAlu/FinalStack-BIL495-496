package com.backend.datamanagment.service;

import com.backend.cloud.service.CloudService;
import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.dto.GCSPage;
import com.backend.model.entity.UsExaminationRegion;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.Storage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ExaminationVideoListingServiceImpl implements ExaminationVideoListingService{

    private String bucketName;

    @Autowired
    private CloudService cloudService;

    public ExaminationVideoListingServiceImpl(@Value("${gcp.storage.bucket-name}") String bucketName) {
        this.bucketName = bucketName;
    }
    @Override
    public GCSPage<Map<String, Object>> getExaminationVideosByPatientId(Long patientId, String pageToken, Pageable pageable) {
        String prefix = String.format("ai/PT_%d/", patientId);
        int targetSize = pageable.getPageSize() * UsExaminationRegion.values().length;
        if(pageToken == null) pageToken = "";
        Map<String, Map<String, Object>> exams = new LinkedHashMap<>();

        do{
            com.google.api.gax.paging.Page<Blob> blobPage = cloudService.getStorage().list(bucketName,
                    Storage.BlobListOption.prefix(prefix),
                    Storage.BlobListOption.pageSize(targetSize),
                    Storage.BlobListOption.pageToken(pageToken));

            for (Blob blob : blobPage.getValues()) {
                String path = blob.getName();
                String[] parts = path.split("/");
                // Klasör yapısı kontrolü ve thumbnail filtresi
                if (parts.length < 4 || path.contains("_thumb")) continue;

                try {
                    String examName = parts[2]; // "EX_123"
                    String regionPart = parts[3].split("\\.")[0].toLowerCase(); // "r1"

                    Map<String, Object> examRegions = exams.computeIfAbsent(examName, key -> new LinkedHashMap<>());
                    Map<String, Object> regionData = new LinkedHashMap<>();
                    regionData.put("url", cloudService.generateV4GetObjectSignedUrl(path));
                    regionData.put("fileSize", blob.getSize());
                    regionData.put("uploadDate", blob.getCreateTimeOffsetDateTime().toLocalDateTime());
                    examRegions.put(regionPart, regionData);
                } catch (Exception e) {
                    System.out.println(e.getMessage());
                    continue;
                }
            }
            pageToken = blobPage.getNextPageToken();
        } while (pageToken != null && !pageToken.isEmpty());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("patientId", patientId);
        payload.put("exams", exams);

        List<Map<String, Object>> content = new ArrayList<>();
        content.add(payload);
        return new GCSPage<>(content, null);
    }
}
