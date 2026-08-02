package com.example.businessstore.dto.request;
import com.example.businessstore.constant.PaymentMethod;
import jakarta.validation.constraints.NotNull;
public record CreatePaymentRequest(@NotNull PaymentMethod method) {}
