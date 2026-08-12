package com.example.businessstore.service.impl;

import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Luật xác thực dùng chung cho mọi payload multipart mang một mảng "spreads" (metadata JSON +
 * ảnh đi kèm, khớp nhau qua imageId == tên file): dùng bởi cả photobook share preview và
 * photobook design. Tách ra đây để hai luồng không lệch nhau về giới hạn kích thước hay cách
 * đối chiếu imageId.
 */
@Component
@RequiredArgsConstructor
class PhotobookSpreadsPayloadValidator {

    static final int MAX_IMAGES = 120;
    static final int MAX_SPREADS = 100;
    static final int MAX_METADATA_CHARS = 250_000;

    private final ObjectMapper objectMapper;

    JsonNode parseMetadata(String json, String... requiredFields) {
        if (json == null || json.length() > MAX_METADATA_CHARS) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Metadata is too large");
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            if (node == null || !node.isObject()) {
                throw new AppException(ErrorCode.INVALID_REQUEST, "Invalid metadata JSON");
            }
            for (String field : requiredFields) {
                if (!node.has(field)) {
                    throw new AppException(ErrorCode.INVALID_REQUEST, "Missing required field: " + field);
                }
            }
            return node;
        } catch (JacksonException e) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Invalid metadata JSON");
        }
    }

    String textField(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull() || !value.isTextual() || value.asText().isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Missing required field: " + field);
        }
        return value.asText().trim();
    }

    String optionalField(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value != null && !value.isNull() ? value.asText() : null;
    }

    String nodeToString(JsonNode node) {
        if (node == null || !node.isArray()) return "[]";
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JacksonException e) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Could not store spreads");
        }
    }

    Set<String> imageIdsIn(JsonNode spreads) {
        if (spreads == null || !spreads.isArray() || spreads.size() == 0 || spreads.size() > MAX_SPREADS) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Must contain between 1 and " + MAX_SPREADS + " spreads");
        }
        Set<String> imageIds = new HashSet<>();
        for (JsonNode spread : spreads) {
            JsonNode slots = spread.get("slots");
            if (!spread.isObject() || slots == null || !slots.isArray()) {
                throw new AppException(ErrorCode.INVALID_REQUEST, "Each spread must include slots");
            }
            for (JsonNode slot : slots) {
                JsonNode imageId = slot.get("imageId");
                if (imageId == null || imageId.isNull()) continue;
                if (!imageId.isTextual() || imageId.asText().isBlank() || imageId.asText().length() > 100) {
                    throw new AppException(ErrorCode.INVALID_REQUEST, "Invalid image id");
                }
                imageIds.add(imageId.asText());
            }
        }
        if (imageIds.isEmpty() || imageIds.size() > MAX_IMAGES) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Must contain between 1 and " + MAX_IMAGES + " images");
        }
        return imageIds;
    }

    Set<String> uploadedImageIds(List<MultipartFile> images) {
        if (images == null || images.isEmpty() || images.size() > MAX_IMAGES) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Must upload between 1 and " + MAX_IMAGES + " images");
        }
        Set<String> imageIds = new HashSet<>();
        for (MultipartFile file : images) {
            String imageId = file == null ? null : file.getOriginalFilename();
            if (imageId == null || imageId.isBlank() || imageId.length() > 100 || !imageIds.add(imageId)) {
                throw new AppException(ErrorCode.INVALID_REQUEST, "Image ids must be unique");
            }
        }
        return imageIds;
    }
}
