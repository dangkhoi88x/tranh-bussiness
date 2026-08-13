package com.example.businessstore.security;

import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Đếm request theo IP cho các endpoint xác thực, dùng cửa sổ cố định lưu trong Redis nên
 * hạn mức áp dụng chung cho mọi instance.
 *
 * <p>Chạy ở tầng interceptor chứ không phải filter để AppException đi qua
 * GlobalExceptionHandler và trả về đúng phong bì JSON như mọi lỗi khác.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AuthRateLimitInterceptor implements HandlerInterceptor {

    private static final String KEY_PREFIX = "auth-rate:";

    private final StringRedisTemplate redisTemplate;
    private final AuthRateLimitProperties properties;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!properties.enabled()) return true;

        Map.Entry<String, AuthRateLimitProperties.Rule> rule = ruleFor(request.getRequestURI());
        if (rule == null || rule.getValue() == null) return true;

        String key = KEY_PREFIX + rule.getKey() + ":" + clientIp(request);
        long used;
        try {
            Long counter = redisTemplate.opsForValue().increment(key);
            used = counter == null ? 0 : counter;
            if (used == 1) redisTemplate.expire(key, rule.getValue().window());
        } catch (DataAccessException redisFailure) {
            // Redis hỏng thì cho request đi tiếp. Chặn hết mới là hỏng nặng hơn: không ai
            // đăng nhập được chỉ vì một hạ tầng phụ trợ chớp tắt.
            log.warn("Không kiểm được hạn mức cho {}; cho request đi tiếp", request.getRequestURI(), redisFailure);
            return true;
        }

        if (used > rule.getValue().limit()) {
            long retryAfter = retryAfterSeconds(key, rule.getValue().window());
            response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfter));
            log.warn("Chặn {} tới {} vì vượt hạn mức ({} lần)", clientIp(request), request.getRequestURI(), used);
            throw new AppException(ErrorCode.TOO_MANY_REQUESTS,
                    "Bạn đã thử quá nhiều lần. Vui lòng đợi " + retryAfter + " giây rồi thử lại.");
        }

        return true;
    }

    private Map.Entry<String, AuthRateLimitProperties.Rule> ruleFor(String uri) {
        return switch (uri) {
            // Đăng nhập bằng Google cũng là một đường tạo phiên nên dùng chung hạn mức.
            case "/api/v1/auth/login", "/api/v1/auth/google" -> Map.entry("login", properties.login());
            case "/api/v1/auth/register" -> Map.entry("register", properties.register());
            // Đổi mật khẩu cũng phải khai mật khẩu hiện tại, tức là một điểm dò mật khẩu
            // nữa. Dùng chung hạn mức với login nhưng đếm riêng, để người gõ nhầm ở đây
            // không bị khoá luôn đường đăng nhập.
            case "/api/v1/auth/password/change" -> Map.entry("password-change", properties.login());
            case "/api/v1/auth/password/forgot" -> Map.entry("password-forgot", properties.passwordForgot());
            case "/api/v1/auth/password/reset" -> Map.entry("password-reset", properties.passwordReset());
            default -> null;
        };
    }

    private long retryAfterSeconds(String key, Duration window) {
        try {
            Long ttl = redisTemplate.getExpire(key, TimeUnit.SECONDS);
            if (ttl != null && ttl > 0) return ttl;
        } catch (DataAccessException ignored) {
            // Không đọc được TTL thì báo trọn cửa sổ, vẫn đúng về mặt hợp đồng.
        }
        return window.toSeconds();
    }

    /**
     * Sau reverse proxy, getRemoteAddr() chỉ đúng khi server.forward-headers-strategy được
     * bật để ForwardedHeaderFilter đọc X-Forwarded-For. Thiếu cấu hình đó thì mọi người
     * dùng chung một IP và hạn mức sẽ chặn nhầm toàn bộ khách.
     */
    private String clientIp(HttpServletRequest request) {
        String remoteAddress = request.getRemoteAddr();
        return remoteAddress == null || remoteAddress.isBlank() ? "unknown" : remoteAddress;
    }
}
