package com.example.businessstore.service;

public interface PasswordResetService {

    void requestReset(String email);

    void resetPassword(String rawToken, String newPassword);
}
