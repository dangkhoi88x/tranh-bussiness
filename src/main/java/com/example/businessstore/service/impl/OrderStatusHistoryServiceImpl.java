package com.example.businessstore.service.impl;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.dto.response.OrderStatusHistoryResponse;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.OrderStatusHistory;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.OrderStatusHistoryRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.service.OrderStatusHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class OrderStatusHistoryServiceImpl implements OrderStatusHistoryService {
    private final OrderStatusHistoryRepository historyRepository;
    private final UserRepository userRepository;

    @Override @Transactional
    public void record(Order order, OrderStatus fromStatus, OrderStatus toStatus, UUID changedBy, String note) {
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrder(order); history.setFromStatus(fromStatus); history.setToStatus(toStatus);
        history.setChangedBy(userRepository.findById(changedBy).orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Changed-by user was not found")));
        history.setNote(normalize(note));
        historyRepository.save(history);
    }

    @Override @Transactional
    public void recordSystem(Order order, OrderStatus fromStatus, OrderStatus toStatus, String note) {
        OrderStatusHistory history = new OrderStatusHistory();
        history.setOrder(order); history.setFromStatus(fromStatus); history.setToStatus(toStatus);
        history.setChangedBy(null); history.setNote(normalize(note)); historyRepository.save(history);
    }

    @Override @Transactional(readOnly = true)
    public List<OrderStatusHistoryResponse> getMine(UUID userId, UUID orderId) {
        return historyRepository.findAllByOrderIdAndOrderUserIdOrderByCreatedAtAsc(orderId, userId).stream().map(this::toResponse).toList();
    }

    @Override @Transactional(readOnly = true)
    public List<OrderStatusHistoryResponse> getForManagement(UUID orderId) {
        return historyRepository.findAllByOrderIdOrderByCreatedAtAsc(orderId).stream().map(this::toResponse).toList();
    }

    private OrderStatusHistoryResponse toResponse(OrderStatusHistory history) {
        User user = history.getChangedBy();
        String name = user == null ? "SYSTEM" : String.join(" ", user.getFirstName(), user.getLastName()).trim();
        return new OrderStatusHistoryResponse(history.getId(), history.getOrder().getId(), history.getFromStatus(), history.getToStatus(), user == null ? null : user.getId(), name, history.getNote(), history.getCreatedAt());
    }

    private String normalize(String value) { return value == null || value.isBlank() ? null : value.trim(); }
}
