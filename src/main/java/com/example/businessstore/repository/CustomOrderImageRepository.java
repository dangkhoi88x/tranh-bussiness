package com.example.businessstore.repository;
import com.example.businessstore.entity.CustomOrderImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;
public interface CustomOrderImageRepository extends JpaRepository<CustomOrderImage, UUID> { Optional<CustomOrderImage> findByIdAndCustomOrderRequestId(UUID id, UUID requestId); }
