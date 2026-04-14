package com.backend.datamanagment.service;

import com.backend.cloud.service.CloudService;
import com.backend.model.dto.ExaminationVideoDTO;
import com.backend.model.dto.GCSPage;
import com.backend.model.entity.ExaminationRegion;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.Storage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ExaminationVideoListingServiceImpl implements ExaminationVideoListingService{

    private String bucketName;

    @Autowired
    private CloudService cloudService;

    public ExaminationVideoListingServiceImpl(@Value("${gcp.storage.bucket-name}") String bucketName) {
        this.bucketName = bucketName;
    }
    @Override
    public GCSPage<ExaminationVideoDTO> getExaminationVideosByPatientId(Long patientId, String pageToken, Pageable pageable) {
        String prefix = String.format("ai/PT_%d/", patientId);
        int targetSize = pageable.getPageSize()*ExaminationRegion.values().length;
        if(pageToken == null) pageToken = "";
        List<ExaminationVideoDTO> dtos = new ArrayList<>();
        do{
            com.google.api.gax.paging.Page<Blob> blobPage = cloudService.getStorage().list(bucketName,
                    Storage.BlobListOption.prefix(prefix),
                    Storage.BlobListOption.pageSize(targetSize-dtos.size()),
                    Storage.BlobListOption.pageToken(pageToken));

            for (Blob blob : blobPage.getValues()) {
                String path = blob.getName();
                String[] parts = path.split("/");
                // Klasör yapısı kontrolü ve thumbnail filtresi
                if (parts.length < 4 || path.contains("_thumb")) continue;

                try {
                    String regionPart = parts[3].split("\\.")[0]; // "R1"
                    ExaminationVideoDTO dto = new ExaminationVideoDTO(patientId, ExaminationRegion.valueOf(regionPart));
                    dto.setExaminationName(parts[2]); // "EX_123"
                    dto.setUrl(cloudService.generateV4GetObjectSignedUrl(path));
                    dto.setFileSize(blob.getSize());
                    dto.setUploadDate(blob.getCreateTimeOffsetDateTime().toLocalDateTime());
                    dtos.add(dto);
                } catch (Exception e) {
                    System.out.println(e.getMessage());
                    continue;
                }
            }
            pageToken = blobPage.getNextPageToken();
        }while (dtos.size() < targetSize && pageToken != null);
        // Spring Page yapısına uyarlıyoruz (GCS offset bilmediği için totalElements'i tahmini veririz)
        return new GCSPage<>(dtos, pageToken);
    }
}
