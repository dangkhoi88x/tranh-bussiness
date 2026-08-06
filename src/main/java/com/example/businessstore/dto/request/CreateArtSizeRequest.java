package com.example.businessstore.dto.request;
import jakarta.validation.constraints.*; import java.math.BigDecimal;
public record CreateArtSizeRequest(@NotBlank @Size(max=30) String code, @NotBlank @Size(max=100) String name, @DecimalMin("0.01") BigDecimal widthCm, @DecimalMin("0.01") BigDecimal heightCm) {}
