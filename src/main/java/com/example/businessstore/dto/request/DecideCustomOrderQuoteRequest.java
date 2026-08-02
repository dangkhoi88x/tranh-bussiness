package com.example.businessstore.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record DecideCustomOrderQuoteRequest(@NotNull Boolean accepted, UUID shippingAddressId) {
}
