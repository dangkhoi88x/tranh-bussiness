package com.example.businessstore.service;

import java.math.BigDecimal;

public interface MailService {

    void sendPasswordResetEmail(String recipient, String resetUrl);

    void sendWelcomeEmail(String recipient, String firstName);

    void sendOrderConfirmedEmail(String recipient, String firstName, String orderCode, BigDecimal totalAmount);
}
