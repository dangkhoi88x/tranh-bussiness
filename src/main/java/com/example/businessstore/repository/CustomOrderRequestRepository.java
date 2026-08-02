package com.example.businessstore.repository;
import com.example.businessstore.entity.CustomOrderRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
public interface CustomOrderRequestRepository extends JpaRepository<CustomOrderRequest, UUID> {
    @EntityGraph(attributePaths = {"selectedFrame", "images"}) Page<CustomOrderRequest> findByUserId(UUID userId, Pageable pageable);
    @EntityGraph(attributePaths = {"selectedFrame", "images"}) Optional<CustomOrderRequest> findByIdAndUserId(UUID id, UUID userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select request from CustomOrderRequest request where request.id = :id and request.user.id = :userId") Optional<CustomOrderRequest> findByIdAndUserIdForUpdate(UUID id, UUID userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select request from CustomOrderRequest request where request.id = :id") Optional<CustomOrderRequest> findByIdForUpdate(UUID id);
    boolean existsByRequestCode(String requestCode);
}
