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
            throw new AppException(ErrorCode.INVALID_REQUEST, "Dữ liệu mô tả quá lớn.");
        }
        try {
            JsonNode node = objectMapper.readTree(json);
            if (node == null || !node.isObject()) {
                throw new AppException(ErrorCode.INVALID_REQUEST, "Dữ liệu mô tả không hợp lệ.");
            }
            for (String field : requiredFields) {
                if (!node.has(field)) {
                    throw new AppException(ErrorCode.INVALID_REQUEST, "Thiếu trường bắt buộc: " + field);
                }
            }
            return node;
        } catch (JacksonException e) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Dữ liệu mô tả không hợp lệ.");
        }
    }

    String textField(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull() || !value.isTextual() || value.asText().isBlank()) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Thiếu trường bắt buộc: " + field);
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
            throw new AppException(ErrorCode.INVALID_REQUEST, "Không lưu được các trang đôi.");
        }
    }

    Set<String> imageIdsIn(JsonNode spreads) {
        if (spreads == null || !spreads.isArray() || spreads.size() == 0 || spreads.size() > MAX_SPREADS) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Phải có từ 1 đến " + MAX_SPREADS + " trang đôi.");
        }
        Set<String> imageIds = new HashSet<>();
        for (JsonNode spread : spreads) {
            JsonNode slots = spread.get("slots");
            if (!spread.isObject() || slots == null || !slots.isArray()) {
                throw new AppException(ErrorCode.INVALID_REQUEST, "Mỗi trang đôi phải có ít nhất một ô ảnh.");
            }
            for (JsonNode slot : slots) {
                JsonNode imageId = slot.get("imageId");
                if (imageId == null || imageId.isNull()) continue;
                if (!imageId.isTextual() || imageId.asText().isBlank() || imageId.asText().length() > 100) {
                    throw new AppException(ErrorCode.INVALID_REQUEST, "Mã ảnh không hợp lệ.");
                }
                imageIds.add(imageId.asText());
            }
        }
        if (imageIds.isEmpty() || imageIds.size() > MAX_IMAGES) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Phải có từ 1 đến " + MAX_IMAGES + " ảnh.");
        }
        return imageIds;
    }

    Set<String> uploadedImageIds(List<MultipartFile> images) {
        if (images == null || images.isEmpty() || images.size() > MAX_IMAGES) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Chỉ tải lên được từ 1 đến " + MAX_IMAGES + " ảnh.");
        }
        Set<String> imageIds = new HashSet<>();
        for (MultipartFile file : images) {
            String imageId = file == null ? null : file.getOriginalFilename();
            if (imageId == null || imageId.isBlank() || imageId.length() > 100 || !imageIds.add(imageId)) {
                throw new AppException(ErrorCode.INVALID_REQUEST, "Mã ảnh không được trùng nhau.");
            }
        }
        return imageIds;
    }
}
