package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import com.example.businessstore.constant.OrderStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter @Entity @Table(name = "order_status_histories") @NoArgsConstructor
public class OrderStatusHistory extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "order_id", nullable = false)
    private Order order;
    @Enumerated(EnumType.STRING) @Column(name = "from_status", nullable = false, length = 20)
    private OrderStatus fromStatus;
    @Enumerated(EnumType.STRING) @Column(name = "to_status", nullable = false, length = 20)
    private OrderStatus toStatus;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "changed_by")
    private User changedBy;
    @Column(columnDefinition = "TEXT")
    private String note;
}
