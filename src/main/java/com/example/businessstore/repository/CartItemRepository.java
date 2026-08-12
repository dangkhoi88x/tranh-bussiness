package com.example.businessstore.repository;

import com.example.businessstore.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {

    Optional<CartItem> findByCartIdAndProductIdAndProductVariantIdAndProductFrameOptionIdAndPageCountAndPhotobookDesignId(UUID cartId, UUID productId, UUID productVariantId, UUID productFrameOptionId, Integer pageCount, UUID photobookDesignId);

    Optional<CartItem> findByCartIdAndProductIdAndProductVariantIdAndProductFrameOptionIdAndPageCountAndPhotobookDesignIdIsNull(UUID cartId, UUID productId, UUID productVariantId, UUID productFrameOptionId, Integer pageCount);

    Optional<CartItem> findByCartIdAndProductIdAndProductVariantIdAndProductFrameOptionIdAndPageCountIsNullAndPhotobookDesignIdIsNull(UUID cartId, UUID productId, UUID productVariantId, UUID productFrameOptionId);

    Optional<CartItem> findByCartIdAndProductIdAndProductVariantIdAndProductFrameOptionIsNullAndPageCountAndPhotobookDesignId(UUID cartId, UUID productId, UUID productVariantId, Integer pageCount, UUID photobookDesignId);

    Optional<CartItem> findByCartIdAndProductIdAndProductVariantIdAndProductFrameOptionIsNullAndPageCountAndPhotobookDesignIdIsNull(UUID cartId, UUID productId, UUID productVariantId, Integer pageCount);

    Optional<CartItem> findByCartIdAndProductIdAndProductVariantIdAndProductFrameOptionIsNullAndPageCountIsNullAndPhotobookDesignIdIsNull(UUID cartId, UUID productId, UUID productVariantId);

    Optional<CartItem> findByIdAndCartUserId(UUID id, UUID userId);
}
