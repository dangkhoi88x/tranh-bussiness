package com.example.businessstore.repository;

import com.example.businessstore.constant.FrameStatus;
import com.example.businessstore.entity.ProductFrameOption;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductFrameOptionRepository extends JpaRepository<ProductFrameOption, UUID> {

    boolean existsByProductIdAndFrameId(UUID productId, UUID frameId);

    boolean existsByFrameId(UUID frameId);

    Optional<ProductFrameOption> findByIdAndProductId(UUID id, UUID productId);

    List<ProductFrameOption> findAllByProductIdOrderByPriceAdjustmentAsc(UUID productId);

    List<ProductFrameOption> findAllByProductIdAndAvailableTrueAndFrameStatusOrderByPriceAdjustmentAsc(
            UUID productId,
            FrameStatus frameStatus);
}
