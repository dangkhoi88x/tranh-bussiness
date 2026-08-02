package com.example.businessstore.dto.request;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
public record CreateShipmentRequest(@NotBlank @Size(max = 120) String carrier, @NotBlank @Size(max = 120) String trackingCode, @NotNull @DecimalMin("0.0") BigDecimal shippingFee) {}
