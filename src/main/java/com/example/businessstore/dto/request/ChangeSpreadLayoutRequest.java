package com.example.businessstore.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ChangeSpreadLayoutRequest(@NotBlank String layoutCode) {
}
