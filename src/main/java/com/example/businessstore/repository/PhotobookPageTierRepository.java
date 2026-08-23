package com.example.businessstore.repository;

import com.example.businessstore.entity.PhotobookPageTier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PhotobookPageTierRepository extends JpaRepository<PhotobookPageTier, UUID> {

    List<PhotobookPageTier> findAllByProductVariantIdOrderByPageCountAsc(UUID productVariantId);

    List<PhotobookPageTier> findAllByProductVariantIdInOrderByPageCountAsc(Collection<UUID> productVariantIds);

    List<PhotobookPageTier> findAllByProductVariantProductIdOrderByPageCountAsc(UUID productId);
}
