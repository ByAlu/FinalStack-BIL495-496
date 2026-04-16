package com.backend.datamanagment.service;

import com.backend.cloud.service.CloudService;
import com.backend.model.dto.GCSPage;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.Storage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class ExaminationVideoListingServiceImpl implements ExaminationVideoListingService{

    private String bucketName;

    @Autowired
    private CloudService cloudService;

    public ExaminationVideoListingServiceImpl(@Value("${gcp.storage.bucket-name}") String bucketName) {
        this.bucketName = bucketName;
    }
    @Override
    public GCSPage<Map<String, Object>> getExaminationVideosByPatientId(Long patientId, Pageable pageable) {
        String patientPrefix = String.format("ai/PT_%d/", patientId);
        int examPageSize = pageable.getPageSize() > 0 ? pageable.getPageSize() : 10;
        int targetPageNumber = Math.max(pageable.getPageNumber(), 0);
        Map<String, Map<String, Object>> exams = new LinkedHashMap<>();

        String currentToken = "";
        com.google.api.gax.paging.Page<Blob> examPage = null;
        for (int currentPage = 0; currentPage <= targetPageNumber; currentPage++) {
            examPage = cloudService.getStorage().list(
                    bucketName,
                    Storage.BlobListOption.prefix(patientPrefix),
                    Storage.BlobListOption.currentDirectory(),
                    Storage.BlobListOption.pageSize(examPageSize),
                    Storage.BlobListOption.pageToken(currentToken)
            );

            if (currentPage == targetPageNumber) {
                break;
            }

            currentToken = examPage.getNextPageToken();
            if (currentToken == null || currentToken.isEmpty()) {
                break;
            }
        }

        if (examPage == null) {
            examPage = cloudService.getStorage().list(
                    bucketName,
                    Storage.BlobListOption.prefix(patientPrefix),
                    Storage.BlobListOption.currentDirectory(),
                    Storage.BlobListOption.pageSize(examPageSize)
            );
        }

        Set<String> examNames = new LinkedHashSet<>();
        for (Blob examBlob : examPage.getValues()) {
            String examPath = examBlob.getName();
            if (!examPath.startsWith(patientPrefix)) continue;
            String[] parts = examPath.split("/");
            // Expected structure: ai/PT_1001/EX_123/
            if (parts.length < 3) continue;

            String examName = parts[2];
            if (examName == null || examName.isBlank()) continue;
            examNames.add(examName);
        }

        for (String examName : examNames) {
            String examPrefix = patientPrefix + examName + "/";
            com.google.api.gax.paging.Page<Blob> regionPage = cloudService.getStorage().list(
                    bucketName,
                    Storage.BlobListOption.prefix(examPrefix)
            );

            Map<String, Object> examRegions = exams.computeIfAbsent(examName, key -> new LinkedHashMap<>());
            for (Blob regionBlob : regionPage.getValues()) {
                String path = regionBlob.getName();
                String[] parts = path.split("/");
                if (parts.length < 4 || path.contains("_thumb")) continue;
                if (regionBlob.isDirectory()) continue;

                try {
                    String regionPart = parts[3].split("\\.")[0].toLowerCase(); // "r1"
                    Map<String, Object> regionData = new LinkedHashMap<>();
                    regionData.put("url", cloudService.generateV4GetObjectSignedUrl(path));
                    regionData.put("fileSize", regionBlob.getSize());
                    regionData.put("uploadDate", regionBlob.getCreateTimeOffsetDateTime().toLocalDateTime());
                    examRegions.put(regionPart, regionData);
                } catch (Exception e) {
                    System.out.println(e.getMessage());
                }
            }
        }

        boolean hasNext = examPage.getNextPageToken() != null && !examPage.getNextPageToken().isEmpty();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("patientId", patientId);
        payload.put("exams", exams);

        List<Map<String, Object>> content = new ArrayList<>();
        content.add(payload);
        return new GCSPage<>(content, null, hasNext);
    }
}
