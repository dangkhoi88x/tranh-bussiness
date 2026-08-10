package com.example.businessstore.dto.response;

import java.time.Instant;
import java.util.Map;

public record SharePreviewResponse(
        String token,
        String productSlug,
        String sizeLabel,
        String pageCount,
        String finish,
        String templateId,
        String spreadsJson,
        Map<String, String> images,
        Instant expiresAt,
        Instant createdAt
) {}
