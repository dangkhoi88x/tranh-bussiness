package com.example.businessstore.repository;

import com.example.businessstore.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {

    // Sáu derived query đối chiếu khoá gộp dòng đã bị bỏ: khoá có sáu chiều nullable nên mỗi
    // chiều thêm vào lại nhân đôi số phương thức. CartServiceImpl.findExistingItem đối chiếu
    // thẳng trên cart.getItems() — xem chú thích ở đó.

    Optional<CartItem> findByIdAndCartUserId(UUID id, UUID userId);
}
