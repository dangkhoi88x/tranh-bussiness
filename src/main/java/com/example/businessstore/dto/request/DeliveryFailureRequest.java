package com.example.businessstore.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeliveryFailureRequest(
        @NotBlank @Size(max = 1000) String failureReason,
        @AssertTrue(message = "Confirm that the returned goods have been received into inventory")
        boolean restockConfirmed) {
}
