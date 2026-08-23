package com.example.businessstore.service;

import com.example.businessstore.dto.response.PhotobookPricingResponse;

import java.util.UUID;

public interface PhotobookService {

    PhotobookPricingResponse getPublishedPricing(UUID productId);
}
