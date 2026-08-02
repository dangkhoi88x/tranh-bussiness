package com.example.businessstore.dto.request;
import com.example.businessstore.constant.ShipmentStatus;
import jakarta.validation.constraints.*;
public record UpdateShipmentStatusRequest(@NotNull ShipmentStatus status, @Size(max = 4000) String failureReason) {}
