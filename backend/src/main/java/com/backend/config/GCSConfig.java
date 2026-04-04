package com.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import java.io.IOException;

@Configuration
public class GCSConfig {

    @Value("${gcp.storage.project-id}")
    private String projectId;

    @Value("classpath:gcp-key.json")
    private Resource gcsKeys;

    @Bean
    public Storage storage() throws IOException {
        // JSON dosyasını okuyup yetki alıyoruz
        GoogleCredentials credentials = GoogleCredentials.fromStream(gcsKeys.getInputStream());
        return StorageOptions.newBuilder()
                .setProjectId(projectId)
                .setCredentials(credentials)
                .build()
                .getService();
    }
}