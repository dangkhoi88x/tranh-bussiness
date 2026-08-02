package com.example.businessstore.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface MediaStorageService {

    UploadedMedia uploadProductImage(UUID productId, MultipartFile file);

    UploadedMedia uploadFrameImage(UUID frameId, MultipartFile file);

    void deleteImage(String publicId);

    record UploadedMedia(String publicId, String secureUrl) {
    }
}
