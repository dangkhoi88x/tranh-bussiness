package com.example.businessstore.service.impl;

import com.example.businessstore.dto.response.SharePreviewResponse;
import com.example.businessstore.entity.PhotobookSharePreview;
import com.example.businessstore.entity.PhotobookSharePreviewImage;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookSharePreviewRepository;
import com.example.businessstore.service.MediaStorageService;
import com.example.businessstore.service.PhotobookSharePreviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Slf4j
@RequiredArgsConstructor
public class PhotobookSharePreviewServiceImpl implements PhotobookSharePreviewService {

    private static final int TOKEN_LENGTH = 12;
    private static final int EXPIRY_DAYS = 30;
    private static final String TOKEN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PhotobookSharePreviewRepository repository;
    private final MediaStorageService mediaStorageService;
    private final PhotobookSpreadsPayloadValidator payloadValidator;

    @Override
    @Transactional
    public SharePreviewResponse create(String metadataJson, List<MultipartFile> images) {
        JsonNode metadata = payloadValidator.parseMetadata(metadataJson, "productSlug", "spreads");
        Set<String> referencedImageIds = payloadValidator.imageIdsIn(metadata.get("spreads"));
        Set<String> uploadedImageIds = payloadValidator.uploadedImageIds(images);
        if (!referencedImageIds.equals(uploadedImageIds)) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Preview images must match the photos placed in spreads");
        }

        PhotobookSharePreview preview = new PhotobookSharePreview();
        preview.setToken(generateUniqueToken());
        preview.setProductSlug(payloadValidator.textField(metadata, "productSlug"));
        preview.setSizeLabel(payloadValidator.optionalField(metadata, "sizeLabel"));
        preview.setPageCount(payloadValidator.optionalField(metadata, "pageCount"));
        preview.setFinish(payloadValidator.optionalField(metadata, "finish"));
        preview.setTemplateId(payloadValidator.optionalField(metadata, "templateId"));
        preview.setSpreadsJson(payloadValidator.nodeToString(metadata.get("spreads")));
        preview.setExpiresAt(Instant.now().plus(EXPIRY_DAYS, ChronoUnit.DAYS));

        repository.save(preview);

        List<String> uploadedMediaIds = new ArrayList<>();
        try {
            for (MultipartFile file : images) {
                String imageKey = file.getOriginalFilename();
                MediaStorageService.UploadedMedia uploaded =
                        mediaStorageService.uploadSharePreviewImage(preview.getId(), file);
                uploadedMediaIds.add(uploaded.publicId());
                PhotobookSharePreviewImage img = new PhotobookSharePreviewImage();
                img.setPreview(preview);
                img.setImageKey(imageKey);
                img.setPublicId(uploaded.publicId());
                img.setSecureUrl(uploaded.secureUrl());
                preview.getImages().add(img);
            }
            repository.save(preview);
            return toResponse(preview);
        } catch (RuntimeException exception) {
            uploadedMediaIds.forEach(this::deleteSharePreviewImageSafely);
            throw exception;
        }
    }

    @Override
    @Transactional(readOnly = true)
    public SharePreviewResponse getByToken(String token) {
        PhotobookSharePreview preview = repository.findByToken(token)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Preview not found"));

        if (!preview.getExpiresAt().isAfter(Instant.now())) {
            throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Preview has expired");
        }
        return toResponse(preview);
    }

    @Override
    @Transactional
    public void deleteExpiredPreviews() {
        for (PhotobookSharePreview preview : repository.findAllByExpiresAtBefore(Instant.now())) {
            for (PhotobookSharePreviewImage image : preview.getImages()) {
                deleteSharePreviewImageSafely(image.getPublicId());
            }
            repository.delete(preview);
        }
    }

    private SharePreviewResponse toResponse(PhotobookSharePreview preview) {
        Map<String, String> imageMap = new LinkedHashMap<>();
        for (PhotobookSharePreviewImage image : preview.getImages()) {
            imageMap.put(image.getImageKey(), mediaStorageService.signedSharePreviewImageUrl(image.getPublicId()));
        }
        return new SharePreviewResponse(
                preview.getToken(),
                preview.getProductSlug(),
                preview.getSizeLabel(),
                preview.getPageCount(),
                preview.getFinish(),
                preview.getTemplateId(),
                preview.getSpreadsJson(),
                imageMap,
                preview.getExpiresAt(),
                preview.getCreatedAt()
        );
    }

    private String generateUniqueToken() {
        String token;
        do {
            StringBuilder builder = new StringBuilder(TOKEN_LENGTH);
            for (int i = 0; i < TOKEN_LENGTH; i++) {
                builder.append(TOKEN_CHARS.charAt(RANDOM.nextInt(TOKEN_CHARS.length())));
            }
            token = builder.toString();
        } while (repository.existsByToken(token));
        return token;
    }

    private void deleteSharePreviewImageSafely(String publicId) {
        try {
            mediaStorageService.deleteSharePreviewImage(publicId);
        } catch (RuntimeException exception) {
            log.warn("Could not remove share preview image {}", publicId, exception);
        }
    }
}
