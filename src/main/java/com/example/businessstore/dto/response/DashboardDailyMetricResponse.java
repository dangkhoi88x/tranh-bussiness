package com.example.businessstore.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DashboardDailyMetricResponse(LocalDate date, long orderCount, BigDecimal revenue) {
}
