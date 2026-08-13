package com.example.businessstore.service.impl;

import com.example.businessstore.configuration.MailProperties;
import com.example.businessstore.service.MailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;

/**
 * Mọi phương thức gửi thư đều chạy trên mailExecutor, nên người gọi không bao giờ phải chờ
 * SMTP. Đổi lại, không ai bắt được lỗi gửi thư nữa: thất bại chỉ được ghi log, đúng như
 * cách các luồng nghiệp vụ vẫn đối xử với nó từ trước (gửi thư không bao giờ được phép
 * làm hỏng việc tạo tài khoản hay xác nhận đơn hàng).
 */
@Slf4j
@Service
@Async("mailExecutor")
@RequiredArgsConstructor
public class MailServiceImpl implements MailService {

    private final JavaMailSender mailSender;
    private final MailProperties mailProperties;

    @Override
    public void sendPasswordResetEmail(String recipient, String resetUrl) {
        send(recipient, "Đặt lại mật khẩu Business Store",
                "Mở liên kết dưới đây để đặt mật khẩu mới. Liên kết chỉ dùng được một lần "
                        + "và sẽ hết hạn sau ít phút:\n" + resetUrl
                        + "\n\nNếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này.",
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
    public void sendOrderPlacedEmail(String recipient, String firstName, String orderCode, BigDecimal totalAmount) {
        String amount = currency(totalAmount);
        send(recipient, "Đã nhận đơn hàng " + orderCode,
                "Chào " + firstName + ",\n\nChúng tôi đã nhận đơn hàng " + orderCode + ". "
                        + "Tổng thanh toán tạm tính: " + amount + ". "
                        + "Bạn có thể theo dõi tiến độ đơn hàng trong tài khoản của mình.",
                "order-placed");
    }

    @Override
    public void sendOrderConfirmedEmail(String recipient, String firstName, String orderCode, BigDecimal totalAmount) {
        String amount = currency(totalAmount);
        send(recipient, "Đơn hàng " + orderCode + " đã được xác nhận",
                "Chào " + firstName + ",\n\nĐơn hàng " + orderCode + " đã được xác nhận. "
                        + "Tổng thanh toán: " + amount + ". Chúng tôi sẽ sớm chuẩn bị đơn để giao cho bạn.",
                "order-confirmed");
    }

    @Override
    public void sendOrderShippedEmail(String recipient, String firstName, String orderCode, String carrier, String trackingCode) {
        send(recipient, "Đơn hàng " + orderCode + " đang được giao",
                "Chào " + firstName + ",\n\nĐơn hàng " + orderCode + " đã được bàn giao cho " + carrier + ".\n"
                        + "Mã vận đơn: " + trackingCode + ".\n\nBạn có thể theo dõi tiến độ đơn hàng trong tài khoản của mình.",
                "order-shipped");
    }

    @Override
    public void sendCustomOrderQuoteEmail(String recipient, String firstName, String requestCode, BigDecimal quotedPrice, String staffNote) {
        String note = staffNote == null || staffNote.isBlank() ? "" : "\n\nGhi chú từ xưởng: " + staffNote.trim();
        send(recipient, "Báo giá yêu cầu in " + requestCode,
                "Chào " + firstName + ",\n\nXưởng đã gửi báo giá cho yêu cầu " + requestCode + ".\n"
                        + "Giá báo: " + currency(quotedPrice) + "."
                        + note + "\n\nVui lòng vào tài khoản để đồng ý hoặc từ chối báo giá.",
                "custom-order-quote");
    }

    private String currency(BigDecimal amount) {
        return NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN")).format(amount);
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
            // Ném tiếp cũng vô nghĩa vì đang ở thread nền, không người gọi nào bắt được.
            log.error("Could not send {} email to {}", kind, recipient, exception);
        }
    }
}
