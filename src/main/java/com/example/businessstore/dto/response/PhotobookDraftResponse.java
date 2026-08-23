package com.example.businessstore.dto.response;

import java.time.Instant;

public record PhotobookDraftResponse(
        String productSlug,
        String draftJson,
        Instant updatedAt
) {}
