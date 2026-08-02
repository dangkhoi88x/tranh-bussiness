package com.example.businessstore.service.impl;

import com.example.businessstore.constant.CustomOrderRequestStatus;
import com.example.businessstore.constant.CustomOrderRequestType;
import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.dto.request.DecideCustomOrderQuoteRequest;
import com.example.businessstore.dto.response.OrderResponse;
import com.example.businessstore.entity.CustomOrderRequest;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.User;
import com.example.businessstore.repository.CustomOrderRequestRepository;
import com.example.businessstore.repository.FrameRepository;
import com.example.businessstore.repository.OrderRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.service.MediaStorageService;
import com.example.businessstore.service.MediaTransactionSynchronizer;
import com.example.businessstore.service.OrderService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomOrderRequestServiceImplTest {
    @Mock private CustomOrderRequestRepository requestRepository;
    @Mock private FrameRepository frameRepository;
    @Mock private UserRepository userRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private OrderService orderService;
    @Mock private MediaStorageService mediaStorageService;
    @Mock private MediaTransactionSynchronizer mediaTransactionSynchronizer;
    @InjectMocks private CustomOrderRequestServiceImpl service;

    @Test
    void acceptQuote_createsLinkedOrderAndConfirmsRequest() {
        UUID userId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        CustomOrderRequest request = quotedRequest(requestId, userId);
        Order linkedOrder = new Order(); linkedOrder.setId(orderId); linkedOrder.setOrderCode("ART-CUSTOM-001");
        OrderResponse response = new OrderResponse(orderId, "ART-CUSTOM-001", OrderStatus.PENDING, null, null, new BigDecimal("900000"), new BigDecimal("900000"), null, List.of(), null);

        when(requestRepository.findByIdAndUserIdForUpdate(requestId, userId)).thenReturn(Optional.of(request));
        when(orderService.createFromCustomRequest(eq(userId), any(UUID.class), eq(request))).thenReturn(response);
        when(orderRepository.getReferenceById(orderId)).thenReturn(linkedOrder);

        service.decideQuote(userId, requestId, new DecideCustomOrderQuoteRequest(true, UUID.randomUUID()));

        assertThat(request.getStatus()).isEqualTo(CustomOrderRequestStatus.CONFIRMED);
        assertThat(request.getOrder()).isSameAs(linkedOrder);
        verify(orderService).createFromCustomRequest(eq(userId), any(UUID.class), eq(request));
    }

    @Test
    void declineQuote_cancelsRequestWithoutCreatingOrder() {
        UUID userId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();
        CustomOrderRequest request = quotedRequest(requestId, userId);
        when(requestRepository.findByIdAndUserIdForUpdate(requestId, userId)).thenReturn(Optional.of(request));

        service.decideQuote(userId, requestId, new DecideCustomOrderQuoteRequest(false, null));

        assertThat(request.getStatus()).isEqualTo(CustomOrderRequestStatus.CANCELLED);
        org.mockito.Mockito.verifyNoInteractions(orderService);
    }

    private CustomOrderRequest quotedRequest(UUID requestId, UUID userId) {
        User user = new User(); user.setId(userId);
        CustomOrderRequest request = new CustomOrderRequest();
        request.setId(requestId); request.setUser(user); request.setRequestCode("REQ-001"); request.setType(CustomOrderRequestType.FAMILY_PHOTO); request.setWidthCm(new BigDecimal("40")); request.setHeightCm(new BigDecimal("60")); request.setMaterial("Canvas"); request.setQuotedPrice(new BigDecimal("900000")); request.setStatus(CustomOrderRequestStatus.QUOTED);
        return request;
    }
}
