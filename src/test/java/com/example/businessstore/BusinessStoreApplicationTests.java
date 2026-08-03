package com.example.businessstore;

import com.example.businessstore.constant.PromotionStatus;
import com.example.businessstore.constant.PromotionType;
import com.example.businessstore.entity.Promotion;
import com.example.businessstore.repository.PromotionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class BusinessStoreApplicationTests {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    @Autowired PromotionRepository promotionRepository;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    void contextLoads() {
    }

    @Test
    void atomicQuotaReservation_allowsOnlyOneWinnerForLastSlot() throws Exception {
        Promotion promotion = new Promotion();
        promotion.setName("Last slot"); promotion.setCode("LAST-" + System.nanoTime());
        promotion.setType(PromotionType.FIXED_AMOUNT); promotion.setDiscountValue(BigDecimal.ONE);
        promotion.setMinOrderAmount(BigDecimal.ZERO); promotion.setStartAt(Instant.now().minusSeconds(60));
        promotion.setEndAt(Instant.now().plusSeconds(3600)); promotion.setUsageLimit(1);
        promotion.setReservedCount(0); promotion.setUsedCount(0); promotion.setPerUserLimit(1);
        promotion.setAppliesToAll(true);
        promotion.setStatus(PromotionStatus.ACTIVE);
        Promotion saved = promotionRepository.saveAndFlush(promotion);

        TransactionTemplate transactions = new TransactionTemplate(transactionManager);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> {
                start.await();
                return transactions.execute(status -> promotionRepository.reserveQuota(saved.getId(), Instant.now()));
            });
            var second = executor.submit(() -> {
                start.await();
                return transactions.execute(status -> promotionRepository.reserveQuota(saved.getId(), Instant.now()));
            });
            start.countDown();
            assertThat(first.get() + second.get()).isEqualTo(1);
        }

        assertThat(promotionRepository.findById(saved.getId()).orElseThrow().getReservedCount()).isEqualTo(1);
    }
}
