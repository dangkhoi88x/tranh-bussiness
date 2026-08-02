package com.example.businessstore.dto.request;
import com.example.businessstore.constant.CustomOrderRequestStatus;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.UUID;
public record QuoteCustomOrderRequest(@NotNull @DecimalMin("0.0") BigDecimal quotedPrice, UUID frameId, @Size(max = 4000) String staffNote, @NotNull CustomOrderRequestStatus status) {}
