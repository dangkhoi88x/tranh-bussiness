package com.example.businessstore.repository;
import com.example.businessstore.entity.ShippingAddress;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface ShippingAddressRepository extends JpaRepository<ShippingAddress, UUID> {
    List<ShippingAddress> findAllByUserIdOrderByDefaultAddressDescCreatedAtDesc(UUID userId);
    Optional<ShippingAddress> findByIdAndUserId(UUID id, UUID userId);
    boolean existsByUserId(UUID userId);
    @Modifying @Query("update ShippingAddress address set address.defaultAddress = false where address.user.id = :userId and address.defaultAddress = true")
    void clearDefaultByUserId(@Param("userId") UUID userId);
}
