package com.example.businessstore.service.impl;

import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.response.PhotobookPricingResponse;
import com.example.businessstore.entity.PhotobookPageTier;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookPageTierRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.service.PhotobookPricing;
import com.example.businessstore.service.PhotobookService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PhotobookServiceImpl implements PhotobookService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final PhotobookPageTierRepository photobookPageTierRepository;

    @Override
    @Transactional(readOnly = true)
    public PhotobookPricingResponse getPublishedPricing(UUID productId) {
        Product product = productRepository.findById(productId)
                .filter(item -> item.getStatus() == ProductStatus.PUBLISHED)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Product not found"));
        if (!product.isPagePriced()) {
            throw new AppException(ErrorCode.PRODUCT_NOT_AVAILABLE, "Product is not sold by page count");
        }

        List<ProductVariant> variants = productVariantRepository.findAllByProductIdIn(List.of(product.getId()));
        Map<UUID, List<PhotobookPageTier>> tiersByVariantId = photobookPageTierRepository
                .findAllByProductVariantProductIdOrderByPageCountAsc(product.getId()).stream()
                .collect(Collectors.groupingBy(tier -> tier.getProductVariant().getId()));

        List<PhotobookPricingResponse.Size> sizes = variants.stream()
                // Khổ chưa khai bảng giá thì không bán được — bỏ hẳn thay vì hiện chip báo lỗi khi bấm.
                .filter(variant -> tiersByVariantId.containsKey(variant.getId()))
                .sorted(java.util.Comparator.comparing(ProductVariant::getWidthCm)
                        .thenComparing(ProductVariant::getHeightCm))
                .map(variant -> {
                    List<PhotobookPageTier> tiers = tiersByVariantId.get(variant.getId());
                    List<PhotobookPricingResponse.PageOption> options = PhotobookPricing
                            .selectablePageCounts(product, tiers).stream()
                            .map(pages -> new PhotobookPricingResponse.PageOption(
                                    pages, PhotobookPricing.priceAt(product, tiers, pages)))
                            .toList();
                    return new PhotobookPricingResponse.Size(variant.getId(), variant.getSku(), variant.getName(),
                            variant.getWidthCm(), variant.getHeightCm(), variant.isAvailable(), options);
                })
                .toList();

        return new PhotobookPricingResponse(product.getId(), product.getMinPages(), product.getMaxPages(),
                product.getPageStep(), product.getPricePerStep(), sizes);
    }
}
