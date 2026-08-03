package com.example.businessstore.service;

import com.example.businessstore.dto.response.DashboardResponse;

import java.time.LocalDate;

public interface DashboardService {
    DashboardResponse getOverview(LocalDate from, LocalDate to);
}
