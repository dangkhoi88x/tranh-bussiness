package com.example.businessstore.service;

import com.example.businessstore.dto.request.SavePhotobookTemplateRequest;
import com.example.businessstore.dto.response.PhotobookTemplateResponse;

import java.util.List;
import java.util.UUID;

public interface PhotobookTemplateService {

    /** Chủ đề khách chọn được ở trang sản phẩm. */
    List<PhotobookTemplateResponse> findActive();

    List<PhotobookTemplateResponse> findAllForManagement();

    PhotobookTemplateResponse create(SavePhotobookTemplateRequest request);

    PhotobookTemplateResponse update(UUID id, SavePhotobookTemplateRequest request);
}
