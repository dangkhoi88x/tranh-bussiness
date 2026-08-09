package com.example.businessstore.repository;

import com.example.businessstore.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {

    Optional<CartItem> findByCartIdAndProductIdAndProductVariantIdAndProductFrameOptionIdAndPageCount(UUID cartId, UUID productId, UUID productVariantId, UUID productFrameOptionId, Integer pageCount);

    Optional<CartItem> findByCartIdAndProductIdAndProductVariantIdAndProductFrameOptionIdAndPageCountIsNull(UUID cartId, UUID productId, UUID productVariantId, UUID productFrameOptionId);

    Optional<CartItem> findByCartIdAndProductIdAndProductVariantIdAndProductFrameOptionIsNullAndPageCount(UUID cartId, UUID productId, UUID productVariantId, Integer pageCount);

    Optional<CartItem> findByCartIdAndProductIdAndProductVariantIdAndProductFrameOptionIsNullAndPageCountIsNull(UUID cartId, UUID productId, UUID productVariantId);

    Optional<CartItem> findByIdAndCartUserId(UUID id, UUID userId);
}
