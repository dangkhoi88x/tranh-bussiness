package com.example.businessstore.repository.specification;

import com.example.businessstore.constant.OrderStatus;
import com.example.businessstore.constant.ProductCatalogSort;
import com.example.businessstore.constant.ProductStatus;
import com.example.businessstore.dto.request.ProductCatalogFilter;
import com.example.businessstore.entity.Category;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.OrderItem;
import com.example.businessstore.entity.Product;
import com.example.businessstore.entity.ProductVariant;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.Instant;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * PostgreSQL-backed criteria for the storefront catalogue.  A variant-aware filter
 * uses one correlated subquery, so price, material and dimensions always belong to
 * the same purchasable variant.
 */
public final class ProductCatalogSpecifications {

    private ProductCatalogSpecifications() {
    }

    public static Specification<Product> published(ProductCatalogFilter filter) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.<ProductStatus>get("status"), ProductStatus.PUBLISHED));

            if (filter.categoryId() != null) {
                predicates.add(criteriaBuilder.equal(
                        root.<Category>get("category").<UUID>get("id"), filter.categoryId()));
            }
            if (filter.keyword() != null) {
                predicates.add(matchesKeyword(root, criteriaBuilder, filter.keyword()));
            }
            if (hasVariantAwareCriteria(filter)) {
                predicates.add(matchesPriceMaterialAndSize(root, query, criteriaBuilder, filter));
            }

            applySort(root, query, criteriaBuilder, filter.sort());
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static Predicate matchesKeyword(Root<Product> root, CriteriaBuilder criteriaBuilder, String keyword) {
        String pattern = "%" + escapeLike(normalizeSearchText(keyword)) + "%";
        return criteriaBuilder.or(
                criteriaBuilder.like(normalizedDatabaseText(root.<String>get("name"), criteriaBuilder), pattern, '\\'),
                criteriaBuilder.like(normalizedDatabaseText(root.<String>get("description"), criteriaBuilder), pattern, '\\'));
    }

    private static Predicate matchesPriceMaterialAndSize(
            Root<Product> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder,
            ProductCatalogFilter filter) {
        Predicate hasNoVariants = criteriaBuilder.not(criteriaBuilder.exists(anyVariant(root, query, criteriaBuilder)));
        Predicate baseProductMatches = baseProductMatches(root, criteriaBuilder, filter);
        Predicate matchingAvailableVariant = criteriaBuilder.exists(matchingAvailableVariant(root, query, criteriaBuilder, filter));
        return criteriaBuilder.or(
                criteriaBuilder.and(hasNoVariants, baseProductMatches),
                matchingAvailableVariant);
    }

    private static Subquery<UUID> anyVariant(
            Root<Product> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder) {
        Subquery<UUID> variants = query.subquery(UUID.class);
        Root<ProductVariant> variant = variants.from(ProductVariant.class);
        variants.select(variant.<UUID>get("id"));
        variants.where(criteriaBuilder.equal(
                variant.<Product>get("product").<UUID>get("id"), root.<UUID>get("id")));
        return variants;
    }

    private static Subquery<UUID> matchingAvailableVariant(
            Root<Product> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder,
            ProductCatalogFilter filter) {
        Subquery<UUID> variants = query.subquery(UUID.class);
        Root<ProductVariant> variant = variants.from(ProductVariant.class);
        List<Predicate> predicates = new ArrayList<>();
        predicates.add(criteriaBuilder.equal(
                variant.<Product>get("product").<UUID>get("id"), root.<UUID>get("id")));
        predicates.add(criteriaBuilder.isTrue(variant.<Boolean>get("available")));
        addPricePredicates(variant.<BigDecimal>get("price"), criteriaBuilder, filter, predicates);
        if (filter.material() != null) {
            predicates.add(criteriaBuilder.equal(
                    criteriaBuilder.lower(variant.<String>get("material")), filter.material().toLowerCase(Locale.ROOT)));
        }
        addDimensionPredicates(
                variant.<BigDecimal>get("widthCm"), variant.<BigDecimal>get("heightCm"), criteriaBuilder, filter, predicates);
        variants.select(variant.<UUID>get("id")).where(predicates.toArray(Predicate[]::new));
        return variants;
    }

    private static Predicate baseProductMatches(
            Root<Product> root,
            CriteriaBuilder criteriaBuilder,
            ProductCatalogFilter filter) {
        if (filter.material() != null) {
            return criteriaBuilder.disjunction();
        }
        List<Predicate> predicates = new ArrayList<>();
        addPricePredicates(root.<BigDecimal>get("price"), criteriaBuilder, filter, predicates);
        addDimensionPredicates(
                root.<BigDecimal>get("widthCm"), root.<BigDecimal>get("heightCm"), criteriaBuilder, filter, predicates);
        return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
    }

    private static void addPricePredicates(
            Expression<BigDecimal> price,
            CriteriaBuilder criteriaBuilder,
            ProductCatalogFilter filter,
            List<Predicate> predicates) {
        if (filter.minPrice() != null) {
            predicates.add(criteriaBuilder.greaterThanOrEqualTo(price, filter.minPrice()));
        }
        if (filter.maxPrice() != null) {
            predicates.add(criteriaBuilder.lessThanOrEqualTo(price, filter.maxPrice()));
        }
    }

    private static void addDimensionPredicates(
            Expression<BigDecimal> widthCm,
            Expression<BigDecimal> heightCm,
            CriteriaBuilder criteriaBuilder,
            ProductCatalogFilter filter,
            List<Predicate> predicates) {
        if (filter.widthCm() != null) {
            predicates.add(criteriaBuilder.equal(widthCm, filter.widthCm()));
        }
        if (filter.heightCm() != null) {
            predicates.add(criteriaBuilder.equal(heightCm, filter.heightCm()));
        }
    }

    private static void applySort(
            Root<Product> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder,
            ProductCatalogSort sort) {
        if (Long.class.equals(query.getResultType()) || long.class.equals(query.getResultType())) {
            return;
        }

        Expression<Instant> createdAt = root.<Instant>get("createdAt");
        switch (sort) {
            case PRICE_ASC -> query.orderBy(
                    criteriaBuilder.asc(catalogPrice(root, query, criteriaBuilder)),
                    criteriaBuilder.desc(createdAt));
            case PRICE_DESC -> query.orderBy(
                    criteriaBuilder.desc(catalogPrice(root, query, criteriaBuilder)),
                    criteriaBuilder.desc(createdAt));
            case BEST_SELLING -> query.orderBy(
                    criteriaBuilder.desc(soldQuantity(root, query, criteriaBuilder)),
                    criteriaBuilder.desc(createdAt));
            case NEWEST -> query.orderBy(criteriaBuilder.desc(createdAt));
        }
    }

    private static Expression<BigDecimal> catalogPrice(
            Root<Product> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder) {
        Subquery<BigDecimal> minimumVariantPrice = query.subquery(BigDecimal.class);
        Root<ProductVariant> variant = minimumVariantPrice.from(ProductVariant.class);
        minimumVariantPrice.select(criteriaBuilder.min(variant.<BigDecimal>get("price")));
        minimumVariantPrice.where(criteriaBuilder.and(
                criteriaBuilder.equal(variant.<Product>get("product").<UUID>get("id"), root.<UUID>get("id")),
                criteriaBuilder.isTrue(variant.<Boolean>get("available"))));
        return criteriaBuilder.coalesce(minimumVariantPrice, root.<BigDecimal>get("price"));
    }

    private static Expression<Long> soldQuantity(
            Root<Product> root,
            CriteriaQuery<?> query,
            CriteriaBuilder criteriaBuilder) {
        Subquery<Long> quantity = query.subquery(Long.class);
        Root<OrderItem> item = quantity.from(OrderItem.class);
        Join<OrderItem, Order> order = item.join("order");
        quantity.select(criteriaBuilder.sumAsLong(item.<Integer>get("quantity")));
        quantity.where(criteriaBuilder.and(
                criteriaBuilder.equal(item.<UUID>get("productId"), root.<UUID>get("id")),
                criteriaBuilder.equal(order.<OrderStatus>get("status"), OrderStatus.DELIVERED)));
        return criteriaBuilder.coalesce(quantity, 0L);
    }

    private static boolean hasVariantAwareCriteria(ProductCatalogFilter filter) {
        return filter.minPrice() != null
                || filter.maxPrice() != null
                || filter.material() != null
                || filter.widthCm() != null
                || filter.heightCm() != null;
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static Expression<String> normalizedDatabaseText(
            Expression<String> value,
            CriteriaBuilder criteriaBuilder) {
        return criteriaBuilder.lower(criteriaBuilder.function("unaccent", String.class, value));
    }

    private static String normalizeSearchText(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT);
    }
}
