package com.example.businessstore.service.impl;
import com.example.businessstore.constant.*;
import com.example.businessstore.dto.request.CreateCustomOrderRequest;
import com.example.businessstore.dto.request.DecideCustomOrderQuoteRequest;
import com.example.businessstore.dto.request.QuoteCustomOrderRequest;
import com.example.businessstore.dto.response.*;
import com.example.businessstore.entity.*;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.event.CustomOrderQuotedEvent;
import com.example.businessstore.repository.*;
import com.example.businessstore.service.CustomOrderRequestService;
import com.example.businessstore.service.OrderService;
import com.example.businessstore.service.MediaStorageService;
import com.example.businessstore.service.MediaTransactionSynchronizer;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service @RequiredArgsConstructor
public class CustomOrderRequestServiceImpl implements CustomOrderRequestService {
    private static final int MAX_PAGE_SIZE = 100;
    private final CustomOrderRequestRepository requestRepository;
    private final FrameRepository frameRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final MediaStorageService mediaStorageService;
    private final MediaTransactionSynchronizer mediaTransactionSynchronizer;
    private final ApplicationEventPublisher eventPublisher;
    @Override @Transactional public CustomOrderRequestResponse create(UUID userId, CreateCustomOrderRequest input) {
        CustomOrderRequest request = new CustomOrderRequest(); request.setRequestCode(nextCode()); request.setUser(userRepository.findById(userId).orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Không tìm thấy người dùng."))); request.setType(input.type()); request.setWidthCm(input.widthCm()); request.setHeightCm(input.heightCm()); request.setMaterial(input.material().trim()); request.setCustomerNote(normalize(input.customerNote())); request.setStatus(CustomOrderRequestStatus.NEW); if (input.frameId() != null) request.setSelectedFrame(frame(input.frameId())); return toResponse(requestRepository.save(request)); }
    @Override @Transactional(readOnly = true) public PageResponse<CustomOrderRequestResponse> getMine(UUID userId, int page, int size) { return toPage(requestRepository.findByUserId(userId, pageable(page, size)), page); }
    @Override @Transactional(readOnly = true) public CustomOrderRequestResponse getMineById(UUID userId, UUID id) { return toResponse(owned(id, userId)); }
    @Override @Transactional public CustomOrderRequestResponse uploadImage(UUID userId, UUID id, MultipartFile file) {
        CustomOrderRequest request = owned(id, userId); if (request.getStatus() != CustomOrderRequestStatus.NEW) throw new AppException(ErrorCode.CUSTOM_ORDER_REQUEST_NOT_EDITABLE, "Chỉ thêm được ảnh tham khảo trước khi xưởng báo giá.");
        MediaStorageService.UploadedMedia uploaded = mediaStorageService.uploadCustomOrderImage(id, file); CustomOrderImage image = new CustomOrderImage(); image.setCustomOrderRequest(request); image.setPublicId(uploaded.publicId()); image.setAuthenticated(true);
        try { request.getImages().add(image); CustomOrderRequest saved = requestRepository.save(request); mediaTransactionSynchronizer.deleteCustomOrderImageAfterRollback(uploaded.publicId()); return toResponse(saved); } catch (RuntimeException ex) { mediaTransactionSynchronizer.deleteCustomOrderImageQuietly(uploaded.publicId()); throw ex; }
    }
    @Override @Transactional(readOnly = true) public PageResponse<CustomOrderRequestResponse> getAll(int page, int size) { return toPage(requestRepository.findAll(pageable(page, size)), page); }
    @Override @Transactional public CustomOrderRequestResponse quote(UUID id, QuoteCustomOrderRequest input) {
        CustomOrderRequest request = requestRepository.findByIdForUpdate(id).orElseThrow(() -> new AppException(ErrorCode.CUSTOM_ORDER_REQUEST_NOT_FOUND, "Không tìm thấy yêu cầu đặt riêng."));
        if (request.getStatus() == CustomOrderRequestStatus.COMPLETED || request.getStatus() == CustomOrderRequestStatus.CANCELLED) throw new AppException(ErrorCode.INVALID_CUSTOM_ORDER_STATUS, "Yêu cầu đã hoàn tất hoặc đã huỷ thì không sửa được nữa.");
        if (!allowed(request.getStatus(), input.status())) throw new AppException(ErrorCode.INVALID_CUSTOM_ORDER_STATUS, "Không thể chuyển yêu cầu sang trạng thái này.");
        request.setQuotedPrice(input.quotedPrice()); request.setStaffNote(normalize(input.staffNote())); if (input.frameId() != null) request.setSelectedFrame(frame(input.frameId())); request.setStatus(input.status()); publishQuote(request); return toResponse(request);
    }
    @Override @Transactional public CustomOrderRequestResponse decideQuote(UUID userId, UUID id, DecideCustomOrderQuoteRequest input) {
        CustomOrderRequest request = requestRepository.findByIdAndUserIdForUpdate(id, userId).orElseThrow(() -> new AppException(ErrorCode.CUSTOM_ORDER_REQUEST_NOT_FOUND, "Không tìm thấy yêu cầu đặt riêng."));
        if (request.getStatus() != CustomOrderRequestStatus.QUOTED) throw new AppException(ErrorCode.INVALID_CUSTOM_ORDER_STATUS, "Chỉ đồng ý hoặc từ chối được khi xưởng đã gửi báo giá.");
        if (!input.accepted()) { request.setStatus(CustomOrderRequestStatus.CANCELLED); return toResponse(request); }
        if (input.shippingAddressId() == null) throw new AppException(ErrorCode.CUSTOM_ORDER_SHIPPING_ADDRESS_REQUIRED, "Cần chọn địa chỉ giao hàng trước khi đồng ý báo giá.");
        OrderResponse order = orderService.createFromCustomRequest(userId, input.shippingAddressId(), request);
        request.setOrder(orderRepository.getReferenceById(order.id()));
        request.setStatus(CustomOrderRequestStatus.CONFIRMED);
        return toResponse(request);
    }
    private boolean allowed(CustomOrderRequestStatus current, CustomOrderRequestStatus next) { return (current == CustomOrderRequestStatus.NEW && next == CustomOrderRequestStatus.QUOTED) || (current == CustomOrderRequestStatus.CONFIRMED && next == CustomOrderRequestStatus.IN_PRODUCTION) || (current == CustomOrderRequestStatus.IN_PRODUCTION && next == CustomOrderRequestStatus.COMPLETED); }
    private CustomOrderRequest owned(UUID id, UUID userId) { return requestRepository.findByIdAndUserId(id, userId).orElseThrow(() -> new AppException(ErrorCode.CUSTOM_ORDER_REQUEST_NOT_FOUND, "Không tìm thấy yêu cầu đặt riêng.")); }
    private Frame frame(UUID id) { return frameRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.FRAME_NOT_FOUND, "Không tìm thấy khung tranh.")); }
    private void publishQuote(CustomOrderRequest request) { User user = request.getUser(); eventPublisher.publishEvent(new CustomOrderQuotedEvent(user.getId(), user.getEmail(), user.getFirstName(), request.getId(), request.getRequestCode(), request.getQuotedPrice(), request.getStaffNote())); }
    private Pageable pageable(int page, int size) { return PageRequest.of(Math.max(page, 1) - 1, Math.min(Math.max(size, 1), MAX_PAGE_SIZE), Sort.by(Sort.Direction.DESC, "createdAt")); }
    private PageResponse<CustomOrderRequestResponse> toPage(Page<CustomOrderRequest> source, int page) { return new PageResponse<>(source.getContent().stream().map(this::toResponse).toList(), Math.max(page, 1), source.getSize(), source.getTotalElements(), source.getTotalPages(), source.hasNext()); }
    private CustomOrderRequestResponse toResponse(CustomOrderRequest item) { List<CustomOrderImageResponse> images = item.getImages().stream().map(image -> new CustomOrderImageResponse(image.getId(), image.isAuthenticated() ? mediaStorageService.signedCustomOrderImageUrl(image.getPublicId()) : image.getSecureUrl())).toList(); Frame frame = item.getSelectedFrame(); Order order = item.getOrder(); return new CustomOrderRequestResponse(item.getId(), item.getRequestCode(), item.getType(), item.getWidthCm(), item.getHeightCm(), item.getMaterial(), frame == null ? null : frame.getId(), frame == null ? null : frame.getName(), item.getQuotedPrice(), item.getStaffNote(), item.getCustomerNote(), item.getStatus(), order == null ? null : order.getId(), order == null ? null : order.getOrderCode(), images, item.getCreatedAt()); }
    private String nextCode() { String value; do { value = "REQ-" + LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).format(DateTimeFormatter.BASIC_ISO_DATE) + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(); } while (requestRepository.existsByRequestCode(value)); return value; }
    private String normalize(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
