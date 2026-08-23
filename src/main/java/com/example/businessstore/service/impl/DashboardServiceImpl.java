package com.example.businessstore.service.impl;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.PaymentStatus;
import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.response.DashboardDailyMetricResponse;
import com.example.businessstore.dto.response.DashboardLowStockItemResponse;
import com.example.businessstore.dto.response.DashboardOrderStatusResponse;
import com.example.businessstore.dto.response.DashboardResponse;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.OrderRepository;
import com.example.businessstore.repository.PaymentRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final int DEFAULT_RANGE_DAYS = 30;
    private static final int MAX_RANGE_DAYS = 93;
    private static final int LOW_STOCK_THRESHOLD = 5;

    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardResponse getOverview(LocalDate from, LocalDate to) {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        LocalDate rangeTo = to == null ? today : to;
        LocalDate rangeFrom = from == null ? rangeTo.minusDays(DEFAULT_RANGE_DAYS - 1) : from;
        validateRange(rangeFrom, rangeTo);

        Instant fromInstant = rangeFrom.atStartOfDay(BUSINESS_ZONE).toInstant();
        Instant toExclusive = rangeTo.plusDays(1).atStartOfDay(BUSINESS_ZONE).toInstant();
        Map<LocalDate, Long> ordersByDay = dailyLongs(orderRepository.countCreatedByDayBetween(fromInstant, toExclusive));
        Map<LocalDate, BigDecimal> revenueByDay = dailyMoney(paymentRepository.sumSuccessfulAmountByPaidDayBetween(fromInstant, toExclusive));
        Map<OrderStatus, Long> statuses = statusCounts(orderRepository.countCreatedByStatusBetween(fromInstant, toExclusive));

        List<DashboardDailyMetricResponse> dailyMetrics = rangeFrom.datesUntil(rangeTo.plusDays(1))
                .map(day -> new DashboardDailyMetricResponse(day, ordersByDay.getOrDefault(day, 0L), revenueByDay.getOrDefault(day, BigDecimal.ZERO)))
                .toList();
        List<DashboardOrderStatusResponse> orderStatuses = List.of(OrderStatus.values()).stream()
                .map(status -> new DashboardOrderStatusResponse(status, statuses.getOrDefault(status, 0L)))
                .toList();
        List<DashboardLowStockItemResponse> lowStockItems = lowStockItems();

        return new DashboardResponse(
                rangeFrom,
                rangeTo,
                zeroIfNull(paymentRepository.sumAmountByStatusAndPaidAtBetween(PaymentStatus.SUCCESS, fromInstant, toExclusive)),
                orderRepository.countCreatedBetween(fromInstant, toExclusive),
                statuses.getOrDefault(OrderStatus.PENDING, 0L)
                        + statuses.getOrDefault(OrderStatus.CONFIRMED, 0L)
                        + statuses.getOrDefault(OrderStatus.PROCESSING, 0L),
                zeroIfNull(paymentRepository.sumAmountByStatus(PaymentStatus.PENDING)),
                paymentRepository.countByStatus(PaymentStatus.PENDING),
                productRepository.countBaseProductsByStatusAndStockQuantityLessThanEqual(ProductStatus.PUBLISHED, LOW_STOCK_THRESHOLD)
                        + productVariantRepository.countByProductStatusAndAvailableTrueAndStockQuantityLessThanEqual(
                        ProductStatus.PUBLISHED, LOW_STOCK_THRESHOLD),
                LOW_STOCK_THRESHOLD,
                dailyMetrics,
                orderStatuses,
                lowStockItems);
    }

    private List<DashboardLowStockItemResponse> lowStockItems() {
        List<DashboardLowStockItemResponse> variantItems = productVariantRepository
                .findTop6ByProductStatusAndAvailableTrueAndStockQuantityLessThanEqualOrderByStockQuantityAscProductNameAsc(
                        ProductStatus.PUBLISHED, LOW_STOCK_THRESHOLD)
                .stream()
                .map(variant -> new DashboardLowStockItemResponse(
                        variant.getProduct().getId(), variant.getProduct().getName(), variant.getProduct().getCategory().getName(),
                        variant.getId(), variant.getSku(), variant.getName(), variant.getMaterial(), variant.getWidthCm(),
                        variant.getHeightCm(), variant.getStockQuantity()))
                .toList();
        List<DashboardLowStockItemResponse> baseItems = productRepository
                .findBaseProductsByStatusAndStockQuantityLessThanEqual(ProductStatus.PUBLISHED, LOW_STOCK_THRESHOLD,
                        org.springframework.data.domain.PageRequest.of(0, 6))
                .stream()
                .map(product -> new DashboardLowStockItemResponse(
                        product.getId(), product.getName(), product.getCategory().getName(), null, null, null, null,
                        product.getWidthCm(), product.getHeightCm(), product.getStockQuantity()))
                .toList();
        return java.util.stream.Stream.concat(variantItems.stream(), baseItems.stream())
                .sorted(Comparator.comparingInt(DashboardLowStockItemResponse::stockQuantity)
                        .thenComparing(DashboardLowStockItemResponse::productName)
                        .thenComparing(item -> item.variantSku() == null ? "" : item.variantSku()))
                .limit(6)
                .toList();
    }

    private void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Ngày bắt đầu không được sau ngày kết thúc.");
        }
        if (from.plusDays(MAX_RANGE_DAYS - 1L).isBefore(to)) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Khoảng thời gian không được vượt quá " + MAX_RANGE_DAYS + " ngày.");
        }
    }

    private Map<OrderStatus, Long> statusCounts(List<Object[]> rows) {
        Map<OrderStatus, Long> result = new EnumMap<>(OrderStatus.class);
        for (Object[] row : rows) {
            OrderStatus status = row[0] instanceof OrderStatus value ? value : OrderStatus.valueOf(row[0].toString());
            result.put(status, ((Number) row[1]).longValue());
        }
        return result;
    }

    private Map<LocalDate, Long> dailyLongs(List<Object[]> rows) {
        Map<LocalDate, Long> result = new HashMap<>();
        for (Object[] row : rows) {
            result.put(asDate(row[0]), ((Number) row[1]).longValue());
        }
        return result;
    }

    private Map<LocalDate, BigDecimal> dailyMoney(List<Object[]> rows) {
        Map<LocalDate, BigDecimal> result = new HashMap<>();
        for (Object[] row : rows) {
            result.put(asDate(row[0]), (BigDecimal) row[1]);
        }
        return result;
    }

    private LocalDate asDate(Object value) {
        if (value instanceof LocalDate date) return date;
        if (value instanceof java.sql.Date date) return date.toLocalDate();
        return LocalDate.parse(value.toString());
    }

    private BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
