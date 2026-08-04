package com.example.businessstore.dto.request;
import com.example.businessstore.constant.ArtSizeStatus; import jakarta.validation.constraints.*; import java.math.BigDecimal;
public record UpdateArtSizeRequest(@Size(min=1,max=30) String code, @Size(min=1,max=100) String name, @DecimalMin("0.01") BigDecimal widthCm, @DecimalMin("0.01") BigDecimal heightCm, ArtSizeStatus status) {}
