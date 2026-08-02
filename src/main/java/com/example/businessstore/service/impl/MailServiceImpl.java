package com.example.businessstore.service.impl;

import com.example.businessstore.configuration.MailProperties;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.service.MailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailServiceImpl implements MailService {

    private final JavaMailSender mailSender;
    private final MailProperties mailProperties;

    @Override
    public void sendPasswordResetEmail(String recipient, String resetUrl) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailProperties.from());
        message.setTo(recipient);
        message.setSubject("Reset your Business Store password");
        message.setText("Use this link to set a new password. It expires shortly:\n" + resetUrl);
        try {
            mailSender.send(message);
        } catch (MailException exception) {
            log.warn("Could not send password-reset email", exception);
            throw new AppException(ErrorCode.EMAIL_DELIVERY_FAILED, "Could not send password reset email");
        }
    }
}
