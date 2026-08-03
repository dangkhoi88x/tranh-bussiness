package com.example.businessstore.repository;

import com.example.businessstore.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findAllByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Optional<Notification> findByIdAndUserId(UUID id, UUID userId);

    long countByUserIdAndReadAtIsNull(UUID userId);

    @Modifying
    @Query("update Notification notification set notification.readAt = :readAt "
            + "where notification.user.id = :userId and notification.readAt is null")
    int markAllRead(UUID userId, Instant readAt);

    @Modifying
    @Transactional
    @Query(value = """
            INSERT INTO notifications (id, created_at, updated_at, user_id, type, title, message, action_url, event_key)
            VALUES (:id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, :userId, :type, :title, :message, :actionUrl, :eventKey)
            ON CONFLICT (event_key) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(
            UUID id,
            UUID userId,
            String type,
            String title,
            String message,
            String actionUrl,
            String eventKey);
}
