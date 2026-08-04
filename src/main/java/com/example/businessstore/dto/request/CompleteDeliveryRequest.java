package com.example.businessstore.dto.request;

import jakarta.validation.constraints.Size;

public record CompleteDeliveryRequest(@Size(max = 1000) String note) {
}
