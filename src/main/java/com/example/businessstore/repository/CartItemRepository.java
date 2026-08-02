package com.example.businessstore.repository;

import com.example.businessstore.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {

    Optional<CartItem> findByCartIdAndProductIdAndProductFrameOptionId(UUID cartId, UUID productId, UUID productFrameOptionId);

    Optional<CartItem> findByCartIdAndProductIdAndProductFrameOptionIsNull(UUID cartId, UUID productId);

    Optional<CartItem> findByIdAndCartUserId(UUID id, UUID userId);
}
