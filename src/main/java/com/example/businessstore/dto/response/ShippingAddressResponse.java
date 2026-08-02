package com.example.businessstore.dto.response;
import java.util.UUID;
public record ShippingAddressResponse(UUID id, String recipientName, String phone, String province, String district, String ward, String addressLine, boolean defaultAddress) {}
