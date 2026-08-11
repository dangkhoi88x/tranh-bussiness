package com.example.businessstore.service;

import com.example.businessstore.dto.response.PhotobookDraftResponse;

import java.util.UUID;

public interface PhotobookDraftService {

    PhotobookDraftResponse save(UUID userId, String productSlug, String draftJson);

    PhotobookDraftResponse load(UUID userId, String productSlug);

    void delete(UUID userId, String productSlug);
}
