package com.example.businessstore.service.impl;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.OrderStatusHistory;
import com.example.businessstore.entity.User;
import com.example.businessstore.repository.OrderStatusHistoryRepository;
import com.example.businessstore.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderStatusHistoryServiceImplTest {
    @Mock private OrderStatusHistoryRepository historyRepository;
    @Mock private UserRepository userRepository;
    @InjectMocks private OrderStatusHistoryServiceImpl historyService;

    @Test
    void record_storesActorStatusesAndNote() {
        UUID userId = UUID.randomUUID();
        Order order = new Order(); order.setId(UUID.randomUUID());
        User user = new User(); user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        historyService.record(order, OrderStatus.PENDING, OrderStatus.CONFIRMED, userId, "Đã kiểm tra đơn");

        ArgumentCaptor<OrderStatusHistory> history = ArgumentCaptor.forClass(OrderStatusHistory.class);
        verify(historyRepository).save(history.capture());
        assertThat(history.getValue().getOrder()).isSameAs(order);
        assertThat(history.getValue().getChangedBy()).isSameAs(user);
        assertThat(history.getValue().getFromStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(history.getValue().getToStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(history.getValue().getNote()).isEqualTo("Đã kiểm tra đơn");
    }
}
