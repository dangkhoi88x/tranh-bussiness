package com.example.businessstore.service;
import com.example.businessstore.dto.request.*;
import com.example.businessstore.dto.response.ShippingAddressResponse;
import com.example.businessstore.entity.ShippingAddress;
import java.util.*;
public interface ShippingAddressService {
    ShippingAddressResponse create(UUID userId, CreateShippingAddressRequest request);
    List<ShippingAddressResponse> getMine(UUID userId);
    ShippingAddressResponse update(UUID userId, UUID id, UpdateShippingAddressRequest request);
    void delete(UUID userId, UUID id);
    ShippingAddress getOwned(UUID userId, UUID id);
}
