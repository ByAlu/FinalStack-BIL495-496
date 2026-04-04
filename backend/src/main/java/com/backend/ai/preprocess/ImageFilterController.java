package com.backend.ai.preprocess;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;


@RestController
@RequestMapping("/api/v1/preprocess")
public class ImageFilterController {

    //TODO: Burası değişicek direk file alınmıycak clouddan frame göre çekcek
    @PostMapping("apply")
   public ResponseEntity<byte[]> applyFilter(@RequestParam("image") MultipartFile image) {
        String externalApiUrl = "http://127.0.0.1:8000/filter";
        RestTemplate restTemplate = new RestTemplate();

        try {
            // Prepare multipart request
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("image", new ByteArrayResource(image.getBytes()) {
                @Override
                public String getFilename() {
                    return image.getOriginalFilename();
                }
            });

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            // Send request
            ResponseEntity<byte[]> response = restTemplate.postForEntity(externalApiUrl, requestEntity, byte[].class);

            // Return the response from FastAPI
            return ResponseEntity
                    .status(response.getStatusCode())
                    .header("Content-Type", "image/png")
                    .body(response.getBody());

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }
    @GetMapping("test")
    public String getMethodName() {
        return "Test successful";
    }
    
}