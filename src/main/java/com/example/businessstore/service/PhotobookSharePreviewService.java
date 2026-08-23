package com.example.businessstore.service;

import com.example.businessstore.dto.response.SharePreviewResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface PhotobookSharePreviewService {

    SharePreviewResponse create(String metadataJson, List<MultipartFile> images);

    SharePreviewResponse getByToken(String token);

    void deleteExpiredPreviews();
}
