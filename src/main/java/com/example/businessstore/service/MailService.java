package com.example.businessstore.service;

public interface MailService {

    void sendPasswordResetEmail(String recipient, String resetUrl);
}
