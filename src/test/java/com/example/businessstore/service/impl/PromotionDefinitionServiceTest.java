package com.example.businessstore.service.impl;

import com.example.businessstore.constant.PromotionType;
import com.example.businessstore.dto.request.CreatePromotionRequest;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.CategoryRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.repository.PromotionRepository;
import com.example.businessstore.repository.PromotionUsageRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PromotionDefinitionServiceTest {

    @Mock
    private PromotionRepository promotionRepository;
    @Mock
    private PromotionUsageRepository usageRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductVariantRepository productVariantRepository;
    @InjectMocks
    private PromotionDefinitionService definitionService;

    @Test
    void create_rejectsDuplicateCodeBeforePersistingTheDefinition() {
        CreatePromotionRequest request = new CreatePromotionRequest(
                "Giảm giá", " save10 ", null, PromotionType.PERCENTAGE, BigDecimal.TEN, null,
                BigDecimal.ZERO, Instant.now(), Instant.now().plusSeconds(3600), 10, 1, List.of());
        when(promotionRepository.existsByCodeIgnoreCase("SAVE10")).thenReturn(true);

        assertThatThrownBy(() -> definitionService.create(request))
                .isInstanceOf(AppException.class)
                .extracting(error -> ((AppException) error).getErrorCode())
                .isEqualTo(ErrorCode.PROMOTION_CODE_ALREADY_EXISTS);

        verify(promotionRepository, never()).saveAndFlush(any());
    }
}
