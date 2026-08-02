package com.example.businessstore.dto.response;

import com.example.businessstore.constant.CustomOrderRequestType;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderCustomDetailsResponse(
        UUID customOrderRequestId,
        String requestCode,
        CustomOrderRequestType requestType,
        BigDecimal widthCm,
        BigDecimal heightCm,
        String material,
        UUID frameId,
        String frameName,
        BigDecimal quotedPrice) {
}
