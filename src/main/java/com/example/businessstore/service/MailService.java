package com.example.businessstore.service;

import java.math.BigDecimal;

public interface MailService {

    void sendPasswordResetEmail(String recipient, String resetUrl);

    void sendWelcomeEmail(String recipient, String firstName);

    void sendOrderPlacedEmail(String recipient, String firstName, String orderCode, BigDecimal totalAmount);

    void sendOrderConfirmedEmail(String recipient, String firstName, String orderCode, BigDecimal totalAmount);

    void sendOrderShippedEmail(String recipient, String firstName, String orderCode, String carrier, String trackingCode);

    void sendOrderDeliveredEmail(String recipient, String firstName, String orderCode);

    void sendOrderDeliveryFailedEmail(String recipient, String firstName, String orderCode, String failureReason);

    void sendOrderCancelledEmail(String recipient, String firstName, String orderCode);

    void sendCustomOrderQuoteEmail(String recipient, String firstName, String requestCode, BigDecimal quotedPrice, String staffNote);
}
