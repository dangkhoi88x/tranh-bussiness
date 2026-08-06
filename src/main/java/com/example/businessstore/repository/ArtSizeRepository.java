package com.example.businessstore.repository;
import com.example.businessstore.constant.ArtSizeStatus;
import com.example.businessstore.entity.ArtSize;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List; import java.util.Optional; import java.util.UUID;
public interface ArtSizeRepository extends JpaRepository<ArtSize, UUID> {
 boolean existsByCodeIgnoreCase(String code); boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);
 Optional<ArtSize> findByIdAndStatus(UUID id, ArtSizeStatus status);
 List<ArtSize> findAllByStatusOrderByNameAsc(ArtSizeStatus status); List<ArtSize> findAllByOrderByNameAsc();
}
