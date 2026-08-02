package com.example.businessstore.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record UpdateProductImageRequest(
        @Size(max = 255) String altText,
        @Min(0) Integer sortOrder,
        Boolean primaryImage) {
}
