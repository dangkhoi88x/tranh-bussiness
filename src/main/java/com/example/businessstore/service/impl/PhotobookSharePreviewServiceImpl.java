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
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Slf4j
@RequiredArgsConstructor
public class PhotobookSharePreviewServiceImpl implements PhotobookSharePreviewService {

    private static final int TOKEN_LENGTH = 12;
    private static final int EXPIRY_DAYS = 30;
    private static final int MAX_IMAGES = 120;
    private static final int MAX_SPREADS = 100;
    private static final int MAX_METADATA_CHARS = 250_000;
    private static final String TOKEN_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PhotobookSharePreviewRepository repository;
    private final MediaStorageService mediaStorageService;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public SharePreviewResponse create(String metadataJson, List<MultipartFile> images) {
        JsonNode metadata = parseMetadata(metadataJson);
        Set<String> referencedImageIds = imageIdsIn(metadata.get("spreads"));
        Set<String> uploadedImageIds = uploadedImageIds(images);
        if (!referencedImageIds.equals(uploadedImageIds)) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Preview images must match the photos placed in spreads");
        }

        PhotobookSharePreview preview = new PhotobookSharePreview();
        preview.setToken(generateUniqueToken());
        preview.setProductSlug(textField(metadata, "productSlug"));
        preview.setSizeLabel(optionalField(metadata, "sizeLabel"));
        preview.setPageCount(optionalField(metadata, "pageCount"));
        preview.setFinish(optionalField(metadata, "finish"));
        preview.setTemplateId(optionalField(metadata, "templateId"));
        preview.setSpreadsJson(nodeToString(metadata.get("spreads")));
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

    private JsonNode parseMetadata(String json) {
        if (json == null || json.length() > MAX_METADATA_CHARS) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Preview metadata is too large");
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            if (node == null || !node.isObject() || !node.has("productSlug") || !node.has("spreads")) {
                throw new AppException(ErrorCode.INVALID_REQUEST, "Metadata must include productSlug and spreads");
            }
            return node;
        } catch (JacksonException e) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Invalid metadata JSON");
        }
    }

    private String textField(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull() || !value.isTextual() || value.asText().isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Missing required field: " + field);
        }
        return value.asText().trim();
    }

    private String optionalField(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value != null && !value.isNull() ? value.asText() : null;
    }

    private String nodeToString(JsonNode node) {
        if (node == null || !node.isArray()) return "[]";
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JacksonException e) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Could not store preview spreads");
        }
    }

    private Set<String> imageIdsIn(JsonNode spreads) {
        if (spreads == null || !spreads.isArray() || spreads.size() == 0 || spreads.size() > MAX_SPREADS) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Preview must contain between 1 and " + MAX_SPREADS + " spreads");
        }
        Set<String> imageIds = new HashSet<>();
        for (JsonNode spread : spreads) {
            JsonNode slots = spread.get("slots");
            if (!spread.isObject() || slots == null || !slots.isArray()) {
                throw new AppException(ErrorCode.INVALID_REQUEST, "Each preview spread must include slots");
            }
            for (JsonNode slot : slots) {
                JsonNode imageId = slot.get("imageId");
                if (imageId == null || imageId.isNull()) continue;
                if (!imageId.isTextual() || imageId.asText().isBlank() || imageId.asText().length() > 100) {
                    throw new AppException(ErrorCode.INVALID_REQUEST, "Invalid preview image id");
                }
                imageIds.add(imageId.asText());
            }
        }
        if (imageIds.isEmpty() || imageIds.size() > MAX_IMAGES) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Preview must contain between 1 and " + MAX_IMAGES + " images");
        }
        return imageIds;
    }

    private Set<String> uploadedImageIds(List<MultipartFile> images) {
        if (images == null || images.isEmpty() || images.size() > MAX_IMAGES) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Preview must upload between 1 and " + MAX_IMAGES + " images");
        }
        Set<String> imageIds = new HashSet<>();
        for (MultipartFile file : images) {
            String imageId = file == null ? null : file.getOriginalFilename();
            if (imageId == null || imageId.isBlank() || imageId.length() > 100 || !imageIds.add(imageId)) {
                throw new AppException(ErrorCode.INVALID_REQUEST, "Preview image ids must be unique");
            }
        }
        return imageIds;
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
