package com.example.businessstore.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record DashboardResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal revenue,
        long orderCount,
        long ordersToProcess,
        BigDecimal pendingCodAmount,
        long pendingCodCount,
        long lowStockCount,
        int lowStockThreshold,
        List<DashboardDailyMetricResponse> dailyMetrics,
        List<DashboardOrderStatusResponse> orderStatuses,
        List<DashboardLowStockItemResponse> lowStockItems) {
}
