package com.example.businessstore.entity;
import com.example.businessstore.common.BaseEntity;
import com.example.businessstore.constant.ArtSizeStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.math.BigDecimal;
@Getter @Setter @Entity @Table(name = "art_sizes") @NoArgsConstructor
public class ArtSize extends BaseEntity {
 @Column(nullable=false, unique=true, length=30) private String code;
 @Column(nullable=false, length=100) private String name;
 @Column(name="width_cm", precision=10, scale=2) private BigDecimal widthCm;
 @Column(name="height_cm", precision=10, scale=2) private BigDecimal heightCm;
 @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private ArtSizeStatus status;
 public boolean isCustom() { return "CUSTOM".equalsIgnoreCase(code); }
}
