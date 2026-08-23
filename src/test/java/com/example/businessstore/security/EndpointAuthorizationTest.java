package com.example.businessstore.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.RequestMappingInfo;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * Lưới an toàn cho phân quyền. RBAC của dự án nằm ở hai chỗ tách rời nhau — luật trong
 * SecurityConfiguration và @PreAuthorize trên từng method — nên một endpoint mới quên
 * gắn annotation vẫn build và chạy bình thường. Hai bài test dưới đây bắt đúng chuyện đó.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class EndpointAuthorizationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    private static final String ID = "11111111-1111-1111-1111-111111111111";

    /**
     * Danh sách endpoint được phép trả lời khách chưa đăng nhập. Thêm một endpoint công
     * khai mà không khai báo ở đây thì test đỏ — đó là chủ ý: mở một đường mới ra Internet
     * phải là quyết định có ý thức, không phải hệ quả phụ của việc thêm @GetMapping.
     */
    private static final Set<String> PUBLIC_ENDPOINTS = Set.of(
            "POST /api/v1/auth/register",
            "POST /api/v1/auth/login",
            "POST /api/v1/auth/google",
            "POST /api/v1/auth/refresh",
            "POST /api/v1/auth/logout",
            "POST /api/v1/auth/password/forgot",
            "POST /api/v1/auth/password/reset",
            "GET /api/v1/categories",
            "GET /api/v1/categories/{id}",
            "GET /api/v1/categories/slug/{slug}",
            "GET /api/v1/materials",
            "GET /api/v1/materials/{id}",
            "GET /api/v1/art-sizes",
            "GET /api/v1/art-sizes/{id}",
            "GET /api/v1/frames",
            "GET /api/v1/frames/{id}",
            "GET /api/v1/frames/slug/{slug}",
            "GET /api/v1/products",
            "GET /api/v1/products/{id}",
            "GET /api/v1/products/slug/{slug}",
            "GET /api/v1/products/{productId}/images",
            "GET /api/v1/products/{productId}/variants",
            "GET /api/v1/products/{productId}/frame-options",
            "GET /api/v1/products/{productId}/variants/{variantId}/frame-options",
            "GET /api/v1/products/{productId}/page-pricing",
            "GET /api/v1/products/{productId}/photobook-pricing",
            "GET /api/v1/photobook-templates",
            "GET /api/v1/photobook-share-previews/{token}");

    private static final Set<String> ALL_PERMISSIONS = Set.of(
            "DASHBOARD_VIEW", "USER_MANAGE", "CATEGORY_MANAGE", "PRODUCT_MANAGE", "FRAME_MANAGE",
            "ORDER_MANAGE", "PAYMENT_MANAGE", "CUSTOM_ORDER_MANAGE", "SHIPMENT_MANAGE", "PROMOTION_MANAGE");

    /**
     * Mỗi permission một endpoint đại diện, cố ý chọn loại không cần request body: xác thực
     * request body chạy trước @PreAuthorize, nên một body sai sẽ trả 400 và làm bài test
     * phân quyền mất ý nghĩa.
     */
    private record Guarded(String method, String path, Set<String> allowed, String body) {
        Guarded(String method, String path, String allowed) {
            this(method, path, Set.of(allowed), null);
        }
    }

    private static final List<Guarded> GUARDED_ENDPOINTS = List.of(
            new Guarded("GET", "/api/v1/dashboard", "DASHBOARD_VIEW"),
            new Guarded("GET", "/api/v1/users", "USER_MANAGE"),
            new Guarded("DELETE", "/api/v1/categories/" + ID, "CATEGORY_MANAGE"),
            new Guarded("GET", "/api/v1/products/management", "PRODUCT_MANAGE"),
            new Guarded("GET", "/api/v1/art-sizes/management", "PRODUCT_MANAGE"),
            new Guarded("GET", "/api/v1/materials/management", "PRODUCT_MANAGE"),
            new Guarded("GET", "/api/v1/photobook-templates/management", "PRODUCT_MANAGE"),
            new Guarded("GET", "/api/v1/frames/management", "FRAME_MANAGE"),
            new Guarded("GET", "/api/v1/products/management/" + ID + "/frame-options", "FRAME_MANAGE"),
            new Guarded("GET", "/api/v1/orders", "ORDER_MANAGE"),
            new Guarded("GET", "/api/v1/orders/" + ID + "/history", "ORDER_MANAGE"),
            new Guarded("GET", "/api/v1/admin/order-notifications/stream", "ORDER_MANAGE"),
            new Guarded("GET", "/api/v1/payments", "PAYMENT_MANAGE"),
            new Guarded("GET", "/api/v1/custom-order-requests", "CUSTOM_ORDER_MANAGE"),
            new Guarded("GET", "/api/v1/photobook-projects", "CUSTOM_ORDER_MANAGE"),
            new Guarded("GET", "/api/v1/promotions", "PROMOTION_MANAGE"),
            new Guarded("GET", "/api/v1/promotions/" + ID + "/usages", "PROMOTION_MANAGE"),
            new Guarded("POST", "/api/v1/orders/" + ID + "/shipment", Set.of("SHIPMENT_MANAGE"),
                    "{\"carrier\":\"GHN\",\"trackingCode\":\"TEST-1\",\"shippingFee\":0}"),
            // Khách xem vận đơn của chính mình đi qua endpoint khác; endpoint này cố ý mở cho
            // cả hai vai trò vận hành nên phải kiểm đúng như vậy.
            new Guarded("GET", "/api/v1/orders/" + ID + "/shipment",
                    Set.of("SHIPMENT_MANAGE", "ORDER_MANAGE"), null));

    @Autowired MockMvc mockMvc;
    // Actuator cũng đăng ký một RequestMappingHandlerMapping riêng, nên phải gọi đích danh.
    @Autowired @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping handlerMapping;

    @Test
    void everyEndpointOutsideThePublicListRejectsAnonymousCallers() throws Exception {
        List<String> reachable = new ArrayList<>();

        for (RequestMappingInfo info : handlerMapping.getHandlerMethods().keySet()) {
            for (String path : pathsOf(info)) {
                if (!path.startsWith("/api/v1")) continue;
                for (RequestMethod method : info.getMethodsCondition().getMethods()) {
                    String endpoint = method + " " + path;
                    if (PUBLIC_ENDPOINTS.contains(endpoint)) continue;

                    int status = mockMvc.perform(build(method.name(), fillPathVariables(path), null))
                            .andReturn().getResponse().getStatus();
                    if (status != 401) reachable.add(endpoint + " -> " + status);
                }
            }
        }

        assertThat(reachable)
                .describedAs("Endpoint không nằm trong PUBLIC_ENDPOINTS nhưng khách chưa đăng nhập vẫn gọi được")
                .isEmpty();
    }

    @Test
    void eachManagementEndpointAcceptsOnlyItsOwnPermission() throws Exception {
        List<String> problems = new ArrayList<>();

        for (Guarded endpoint : GUARDED_ENDPOINTS) {
            for (String permission : ALL_PERMISSIONS) {
                int status = statusFor(endpoint, permission);
                boolean allowed = endpoint.allowed().contains(permission);

                if (allowed && (status == 401 || status == 403)) {
                    problems.add("%s %s: %s lẽ ra phải vào được nhưng nhận %d"
                            .formatted(endpoint.method(), endpoint.path(), permission, status));
                }
                if (!allowed && status != 403) {
                    problems.add("%s %s: %s lẽ ra phải bị chặn 403 nhưng nhận %d"
                            .formatted(endpoint.method(), endpoint.path(), permission, status));
                }
            }

            // Khách hàng thường không có permission quản trị nào.
            int customerStatus = statusFor(endpoint, "ROLE_CUSTOMER");
            if (customerStatus != 403) {
                problems.add("%s %s: khách hàng lẽ ra phải bị chặn 403 nhưng nhận %d"
                        .formatted(endpoint.method(), endpoint.path(), customerStatus));
            }
        }

        assertThat(problems).describedAs("Sai lệch phân quyền").isEmpty();
    }

    private int statusFor(Guarded endpoint, String authority) throws Exception {
        MockHttpServletRequestBuilder builder = build(endpoint.method(), endpoint.path(), endpoint.body())
                .with(jwt()
                        .jwt(token -> token.subject(ID))
                        .authorities(new SimpleGrantedAuthority(authority)));
        return mockMvc.perform(builder).andReturn().getResponse().getStatus();
    }

    private MockHttpServletRequestBuilder build(String method, String path, String body) {
        MockHttpServletRequestBuilder builder = request(HttpMethod.valueOf(method), path);
        if (body != null) builder.contentType(MediaType.APPLICATION_JSON).content(body);
        return builder;
    }

    private List<String> pathsOf(RequestMappingInfo info) {
        if (info.getPathPatternsCondition() != null) {
            return info.getPathPatternsCondition().getPatterns().stream()
                    .map(Object::toString).toList();
        }
        return info.getPatternsCondition() == null ? List.of() : List.copyOf(info.getPatternsCondition().getPatterns());
    }

    /** Bộ lọc bảo mật chạy trước khi Spring ép kiểu tham số, nên giá trị nào cũng được. */
    private String fillPathVariables(String path) {
        return path.replaceAll("\\{[^}]+}", ID);
    }
}
