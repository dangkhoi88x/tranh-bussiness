package com.example.businessstore.dto.response;
import com.example.businessstore.constant.ArtSizeStatus; import java.math.BigDecimal; import java.util.UUID;
public record ArtSizeResponse(UUID id, String code, String name, BigDecimal widthCm, BigDecimal heightCm, ArtSizeStatus status) {}
