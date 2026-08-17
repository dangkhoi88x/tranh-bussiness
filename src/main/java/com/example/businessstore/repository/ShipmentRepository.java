package com.example.businessstore.repository;
import com.example.businessstore.entity.Shipment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.query.Param;
import com.example.businessstore.constant.ShipmentStatus;
import java.util.*;
public interface ShipmentRepository extends JpaRepository<Shipment, UUID> { Optional<Shipment> findByOrderId(UUID orderId); Optional<Shipment> findByOrderIdAndOrderUserId(UUID orderId, UUID userId); @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select s from Shipment s where s.id = :id") Optional<Shipment> findByIdForUpdate(UUID id); @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select s from Shipment s where s.order.id = :orderId") Optional<Shipment> findByOrderIdForUpdate(@Param("orderId") UUID orderId); boolean existsByTrackingCode(String trackingCode); boolean existsByTrackingCodeAndIdNot(String trackingCode, UUID id);
    @EntityGraph(attributePaths = "order")
    @Query("""
            select s from Shipment s
            where s.status = coalesce(:status, s.status)
              and lower(s.carrier) like concat('%', lower(coalesce(cast(:carrier as string), s.carrier)), '%')
              and lower(s.trackingCode) like concat('%', lower(coalesce(cast(:trackingCode as string), s.trackingCode)), '%')
            """)
    Page<Shipment> searchForManagement(@Param("status") ShipmentStatus status, @Param("carrier") String carrier,
                                       @Param("trackingCode") String trackingCode, Pageable pageable);
}
