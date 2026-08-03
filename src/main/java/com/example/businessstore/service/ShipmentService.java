package com.example.businessstore.service;
import com.example.businessstore.dto.request.*;
import com.example.businessstore.dto.response.ShipmentResponse;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.constant.ShipmentStatus;
import java.util.UUID;
public interface ShipmentService { ShipmentResponse create(UUID changedBy, UUID orderId, CreateShipmentRequest request); ShipmentResponse getMine(UUID userId, UUID orderId); ShipmentResponse getForManagement(UUID orderId); PageResponse<ShipmentResponse> getAll(ShipmentStatus status, String carrier, String trackingCode, int page, int size); ShipmentResponse updateStatus(UUID changedBy, UUID shipmentId, UpdateShipmentStatusRequest request); }
