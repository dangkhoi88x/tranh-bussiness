package com.example.businessstore.dto.request;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;
public record CheckoutOrderRequest(
        @NotNull UUID shippingAddressId,
        @Size(max = 60) String couponCode) {
}
