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

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailServiceImpl implements MailService {

    private final JavaMailSender mailSender;
    private final MailProperties mailProperties;

    @Override
    public void sendPasswordResetEmail(String recipient, String resetUrl) {
        send(recipient, "Reset your Business Store password",
                "Use this link to set a new password. It expires shortly:\n" + resetUrl,
                "password-reset");
    }

    @Override
    public void sendWelcomeEmail(String recipient, String firstName) {
        send(recipient, "Chào mừng bạn đến với Business Store",
                "Chào " + firstName + ",\n\nCảm ơn bạn đã đăng ký Business Store. "
                        + "Bạn có thể bắt đầu khám phá các tác phẩm và khung tranh ngay bây giờ.",
                "welcome");
    }

    @Override
    public void sendOrderConfirmedEmail(String recipient, String firstName, String orderCode, BigDecimal totalAmount) {
        String amount = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN")).format(totalAmount);
        send(recipient, "Đơn hàng " + orderCode + " đã được xác nhận",
                "Chào " + firstName + ",\n\nĐơn hàng " + orderCode + " đã được xác nhận. "
                        + "Tổng thanh toán: " + amount + ". Chúng tôi sẽ sớm chuẩn bị đơn để giao cho bạn.",
                "order-confirmed");
    }

    private void send(String recipient, String subject, String text, String kind) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailProperties.from());
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(text);
        try {
            mailSender.send(message);
        } catch (MailException exception) {
            log.warn("Could not send {} email", kind, exception);
            throw new AppException(ErrorCode.EMAIL_DELIVERY_FAILED, "Could not send " + kind + " email");
        }
    }
}
