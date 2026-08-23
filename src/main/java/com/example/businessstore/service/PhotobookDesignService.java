package com.example.businessstore.service;

import com.example.businessstore.dto.response.PhotobookDesignResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface PhotobookDesignService {

    /**
     * Chốt một bản thiết kế photobook trước khi thêm vào giỏ hàng: lưu spreads (layout, ảnh,
     * crop, caption, màu nền) và upload ảnh thật lên Cloudinary, đúng khi khách còn ở cửa hàng
     * — cart/order chỉ cần giữ id này, không phải lưu lại toàn bộ payload.
     */
    PhotobookDesignResponse create(UUID userId, String metadataJson, List<MultipartFile> images);
}
