package com.example.businessstore.repository;

import com.example.businessstore.entity.Cart;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CartRepository extends JpaRepository<Cart, UUID> {

    @EntityGraph(attributePaths = {"items", "items.product", "items.productFrameOption", "items.productFrameOption.frame"})
    Optional<Cart> findByUserId(UUID userId);
}
