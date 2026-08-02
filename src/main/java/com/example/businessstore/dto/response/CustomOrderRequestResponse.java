package com.example.businessstore.dto.response;
import com.example.businessstore.constant.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
public record CustomOrderRequestResponse(UUID id, String requestCode, CustomOrderRequestType type, BigDecimal widthCm, BigDecimal heightCm, String material, UUID frameId, String frameName, BigDecimal quotedPrice, String staffNote, String customerNote, CustomOrderRequestStatus status, UUID orderId, String orderCode, List<CustomOrderImageResponse> images, Instant createdAt) {}
