package com.example.businessstore.controller;
import com.example.businessstore.constant.SecurityExpressions;
import com.example.businessstore.dto.request.CreateCustomOrderRequest;
import com.example.businessstore.dto.request.DecideCustomOrderQuoteRequest;
import com.example.businessstore.dto.request.QuoteCustomOrderRequest;
import com.example.businessstore.dto.response.*;
import com.example.businessstore.service.CustomOrderRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;
@RestController @RequestMapping("/api/v1/custom-order-requests") @RequiredArgsConstructor
public class CustomOrderRequestController {
    private final CustomOrderRequestService service;
    @PostMapping public ResponseEntity<ApiResponse<CustomOrderRequestResponse>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateCustomOrderRequest request) { return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.create(userId(jwt), request), "Đã gửi yêu cầu đặt riêng.")); }
    @GetMapping("/mine") public ResponseEntity<ApiResponse<PageResponse<CustomOrderRequestResponse>>> mine(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) { return ResponseEntity.ok(ApiResponse.success(service.getMine(userId(jwt), page, size))); }
    @GetMapping("/mine/{id}") public ResponseEntity<ApiResponse<CustomOrderRequestResponse>> mineById(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) { return ResponseEntity.ok(ApiResponse.success(service.getMineById(userId(jwt), id))); }
    @PostMapping(value = "/mine/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE) public ResponseEntity<ApiResponse<CustomOrderRequestResponse>> upload(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @RequestPart("file") MultipartFile file) { return ResponseEntity.ok(ApiResponse.success(service.uploadImage(userId(jwt), id, file), "Đã tải lên ảnh tham khảo.")); }
    @GetMapping @PreAuthorize(SecurityExpressions.CAN_MANAGE_CUSTOM_ORDERS) public ResponseEntity<ApiResponse<PageResponse<CustomOrderRequestResponse>>> all(@RequestParam(defaultValue = "1") int page, @RequestParam(defaultValue = "10") int size) { return ResponseEntity.ok(ApiResponse.success(service.getAll(page, size))); }
    @PutMapping("/{id}/quote") @PreAuthorize(SecurityExpressions.CAN_MANAGE_CUSTOM_ORDERS) public ResponseEntity<ApiResponse<CustomOrderRequestResponse>> quote(@PathVariable UUID id, @Valid @RequestBody QuoteCustomOrderRequest request) { return ResponseEntity.ok(ApiResponse.success(service.quote(id, request), "Đã cập nhật yêu cầu đặt riêng.")); }
    @PutMapping("/mine/{id}/quote-decision") public ResponseEntity<ApiResponse<CustomOrderRequestResponse>> decideQuote(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody DecideCustomOrderQuoteRequest request) { return ResponseEntity.ok(ApiResponse.success(service.decideQuote(userId(jwt), id, request), "Đã ghi nhận phản hồi báo giá.")); }
    private UUID userId(Jwt jwt) { return UUID.fromString(jwt.getSubject()); }
}
