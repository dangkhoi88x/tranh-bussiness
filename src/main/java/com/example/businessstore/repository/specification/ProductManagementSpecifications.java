package com.example.businessstore.repository.specification;

import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.constant.ProductStockLevel;
import com.example.businessstore.entity.Category;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductVariant;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.math.BigDecimal;
import java.util.Locale;
import java.util.UUID;

/**
 * Management-only product filters. A product with variants is stocked by the
 * sum of its available variants; its legacy product stock is ignored.
 */
public final class ProductManagementSpecifications {

    private static final int LOW_STOCK_THRESHOLD = 5;

    private ProductManagementSpecifications() {
    }

    public static Specification<Product> matching(
            UUID categoryId,
            String name,
            ProductStatus status,
            String variantSku,
            String material,
            ProductStockLevel effectiveStockLevel,
            BigDecimal minPrice,
            BigDecimal maxPrice) {
        return (root, query, criteriaBuilder) -> {
            ArrayList<Predicate> predicates = new ArrayList<>();
            if (categoryId != null) {
                predicates.add(criteriaBuilder.equal(root.<Category>get("category").<UUID>get("id"), categoryId));
            }
            if (name != null) {
                predicates.add(criteriaBuilder.like(criteriaBuilder.lower(root.<String>get("name")), contains(name)));
            }
            if (status != null) {
                predicates.add(criteriaBuilder.equal(root.<ProductStatus>get("status"), status));
            }
            if (minPrice != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.<BigDecimal>get("price"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.<BigDecimal>get("price"), maxPrice));
            }
            if (variantSku != null || material != null) {
                predicates.add(criteriaBuilder.exists(matchingVariant(root, query, criteriaBuilder, variantSku, material)));
            }
            if (effectiveStockLevel != null) {
                predicates.add(matchesStockLevel(root, query, criteriaBuilder, effectiveStockLevel));
            }
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static Subquery<UUID> matchingVariant(
            Root<Product> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder,
            String variantSku,
            String material) {
        Subquery<UUID> variants = query.subquery(UUID.class);
        Root<ProductVariant> variant = variants.from(ProductVariant.class);
        ArrayList<Predicate> predicates = new ArrayList<>();
        predicates.add(criteriaBuilder.equal(variant.<Product>get("product").<UUID>get("id"), root.<UUID>get("id")));
        if (variantSku != null) {
            predicates.add(criteriaBuilder.like(criteriaBuilder.lower(variant.<String>get("sku")), contains(variantSku)));
        }
        if (material != null) {
            predicates.add(criteriaBuilder.like(criteriaBuilder.lower(variant.<String>get("material")), contains(material)));
        }
        return variants.select(variant.<UUID>get("id")).where(predicates.toArray(Predicate[]::new));
    }

    private static Predicate matchesStockLevel(
            Root<Product> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder,
            ProductStockLevel stockLevel) {
        Expression<Long> effectiveStock = effectiveStock(root, query, criteriaBuilder);
        return switch (stockLevel) {
            case OUT_OF_STOCK -> criteriaBuilder.equal(effectiveStock, 0L);
            case LOW_STOCK -> criteriaBuilder.between(effectiveStock, 1L, (long) LOW_STOCK_THRESHOLD);
            case IN_STOCK -> criteriaBuilder.greaterThan(effectiveStock, (long) LOW_STOCK_THRESHOLD);
        };
    }

    private static Expression<Long> effectiveStock(
            Root<Product> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder) {
        Subquery<UUID> anyVariant = query.subquery(UUID.class);
        Root<ProductVariant> anyVariantRoot = anyVariant.from(ProductVariant.class);
        anyVariant.select(anyVariantRoot.<UUID>get("id")).where(criteriaBuilder.equal(
                anyVariantRoot.<Product>get("product").<UUID>get("id"), root.<UUID>get("id")));

        Subquery<Long> availableVariantStock = query.subquery(Long.class);
        Root<ProductVariant> availableVariant = availableVariantStock.from(ProductVariant.class);
        availableVariantStock.select(criteriaBuilder.coalesce(
                        criteriaBuilder.sumAsLong(availableVariant.<Integer>get("stockQuantity")), 0L))
                .where(criteriaBuilder.and(
                        criteriaBuilder.equal(availableVariant.<Product>get("product").<UUID>get("id"), root.<UUID>get("id")),
                        criteriaBuilder.isTrue(availableVariant.<Boolean>get("available"))));

        return criteriaBuilder.<Long>selectCase()
                .when(criteriaBuilder.exists(anyVariant), availableVariantStock)
                .otherwise(root.<Integer>get("stockQuantity").as(Long.class));
    }

    private static String contains(String value) {
        return "%" + value.toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }
}
