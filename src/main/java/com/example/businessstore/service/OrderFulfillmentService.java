package com.example.businessstore.service;

import com.example.businessstore.dto.request.CompleteDeliveryRequest;
import com.example.businessstore.dto.request.DeliveryFailureRequest;

import java.util.UUID;

public interface OrderFulfillmentService {

    void completeDelivery(UUID changedBy, UUID orderId, CompleteDeliveryRequest request);

    void failDelivery(UUID changedBy, UUID orderId, DeliveryFailureRequest request);
}
