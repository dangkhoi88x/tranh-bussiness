package com.example.businessstore.service;

import com.example.businessstore.dto.request.SavePhotobookPagePricingRequest;
import com.example.businessstore.dto.response.PhotobookPagePricingResponse;

import java.util.UUID;

public interface PhotobookPagePricingService {

    PhotobookPagePricingResponse get(UUID productId);

    /** Ghi đè toàn bộ cấu hình và các mức neo của sản phẩm. */
    PhotobookPagePricingResponse save(UUID productId, SavePhotobookPagePricingRequest request);
}
