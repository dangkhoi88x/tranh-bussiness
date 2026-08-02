package com.example.businessstore.repository;
import com.example.businessstore.entity.Shipment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface ShipmentRepository extends JpaRepository<Shipment, UUID> { Optional<Shipment> findByOrderId(UUID orderId); Optional<Shipment> findByOrderIdAndOrderUserId(UUID orderId, UUID userId); @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select s from Shipment s where s.id = :id") Optional<Shipment> findByIdForUpdate(UUID id); boolean existsByTrackingCode(String trackingCode); }
