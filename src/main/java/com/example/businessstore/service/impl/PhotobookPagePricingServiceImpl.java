package com.example.businessstore.service.impl;

import com.example.businessstore.dto.request.SavePhotobookPagePricingRequest;
import com.example.businessstore.dto.response.PhotobookPagePricingResponse;
import com.example.businessstore.entity.PhotobookPageTier;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductVariant;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookPageTierRepository;
import com.example.businessstore.repository.ProductRepository;
import com.example.businessstore.repository.ProductVariantRepository;
import com.example.businessstore.service.PhotobookPagePricingService;
import com.example.businessstore.service.PhotobookPagePricingValidation;
import com.example.businessstore.service.PhotobookPricing;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PhotobookPagePricingServiceImpl implements PhotobookPagePricingService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository productVariantRepository;
    private final PhotobookPageTierRepository photobookPageTierRepository;

    @Override
    @Transactional(readOnly = true)
    public PhotobookPagePricingResponse get(UUID productId) {
        return toResponse(requireProduct(productId));
    }

    @Override
    @Transactional
    public PhotobookPagePricingResponse save(UUID productId, SavePhotobookPagePricingRequest request) {
        Product product = requireProduct(productId);
        List<ProductVariant> variants = productVariantRepository.findAllByProductIdOrderByPriceAsc(productId);

        PhotobookPagePricingValidation.validate(request, variants.stream().map(ProductVariant::getId).toList());

        product.setMinPages(request.minPages());
        product.setMaxPages(request.maxPages());
        product.setPageStep(request.pageStep());
        product.setPricePerStep(request.pricePerStep());

        // Ghi đè: xoá sạch rồi chèn lại thay vì so khớp từng dòng. Bảng neo của một khổ nhiều
        // nhất vài dòng, và cách này khiến trạng thái sau khi lưu luôn đúng bằng thứ vừa gửi lên
        // — không còn dòng cũ nào sót lại vì client quên gửi.
        photobookPageTierRepository.deleteAll(
                photobookPageTierRepository.findAllByProductVariantProductIdOrderByPageCountAsc(productId));
        photobookPageTierRepository.flush();

        Map<UUID, ProductVariant> variantsById = variants.stream()
                .collect(Collectors.toMap(ProductVariant::getId, Function.identity()));
        List<PhotobookPageTier> saved = new ArrayList<>();
        for (SavePhotobookPagePricingRequest.VariantTiers entry : safeVariants(request)) {
            for (SavePhotobookPagePricingRequest.Tier tier : safeTiers(entry.tiers())) {
                PhotobookPageTier row = new PhotobookPageTier();
                row.setProductVariant(variantsById.get(entry.variantId()));
                row.setPageCount(tier.pageCount());
                row.setPrice(tier.price());
                saved.add(row);
            }
        }
        photobookPageTierRepository.saveAll(saved);

        return toResponse(product);
    }

    private Product requireProduct(UUID productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new AppException(ErrorCode.PRODUCT_NOT_FOUND, "Không tìm thấy sản phẩm."));
    }

    private static List<SavePhotobookPagePricingRequest.VariantTiers> safeVariants(SavePhotobookPagePricingRequest request) {
        return request.variants() == null ? List.of() : request.variants();
    }

    private static List<SavePhotobookPagePricingRequest.Tier> safeTiers(List<SavePhotobookPagePricingRequest.Tier> tiers) {
        return tiers == null ? List.of() : tiers;
    }

    private PhotobookPagePricingResponse toResponse(Product product) {
        List<ProductVariant> variants = productVariantRepository.findAllByProductIdOrderByPriceAsc(product.getId());
        List<PhotobookPagePricingResponse.VariantPricing> pricing = variants.stream()
                .map(variant -> toVariantPricing(product, variant))
                .toList();
        return new PhotobookPagePricingResponse(
                product.getId(), product.isPagePriced(), product.getMinPages(), product.getMaxPages(),
                product.getPageStep(), product.getPricePerStep(), pricing);
    }

    private PhotobookPagePricingResponse.VariantPricing toVariantPricing(Product product, ProductVariant variant) {
        List<PhotobookPageTier> tiers =
                photobookPageTierRepository.findAllByProductVariantIdOrderByPageCountAsc(variant.getId());
        List<PhotobookPagePricingResponse.Tier> anchors = tiers.stream()
                .map(tier -> new PhotobookPagePricingResponse.Tier(tier.getPageCount(), tier.getPrice()))
                .toList();
        List<PhotobookPagePricingResponse.SelectablePage> selectable =
                PhotobookPricing.selectablePageCounts(product, tiers).stream()
                        .map(pageCount -> new PhotobookPagePricingResponse.SelectablePage(
                                pageCount, PhotobookPricing.priceAt(product, tiers, pageCount)))
                        .toList();
        return new PhotobookPagePricingResponse.VariantPricing(
                variant.getId(), variant.getSku(), variant.getName(), anchors, selectable);
    }
}
