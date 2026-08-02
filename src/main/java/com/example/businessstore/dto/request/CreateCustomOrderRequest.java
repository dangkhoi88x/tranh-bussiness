package com.example.businessstore.dto.request;
import com.example.businessstore.constant.CustomOrderRequestType;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;
public record CreateCustomOrderRequest(@NotNull CustomOrderRequestType type, @NotNull @DecimalMin("1.0") BigDecimal widthCm, @NotNull @DecimalMin("1.0") BigDecimal heightCm, @NotBlank @Size(max = 100) String material, UUID frameId, @Size(max = 4000) String customerNote) {}
