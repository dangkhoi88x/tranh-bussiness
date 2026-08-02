package com.example.businessstore.repository;
import com.example.businessstore.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import java.util.*;
public interface ProductVariantRepository extends JpaRepository<ProductVariant, UUID> { List<ProductVariant> findAllByProductIdOrderByPriceAsc(UUID productId); List<ProductVariant> findAllByProductIdAndAvailableTrueOrderByPriceAsc(UUID productId); Optional<ProductVariant> findByIdAndProductId(UUID id, UUID productId); boolean existsByProductId(UUID productId); boolean existsBySku(String sku); boolean existsBySkuAndIdNot(String sku, UUID id); @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select variant from ProductVariant variant where variant.id = :id") Optional<ProductVariant> findByIdForUpdate(UUID id); }
