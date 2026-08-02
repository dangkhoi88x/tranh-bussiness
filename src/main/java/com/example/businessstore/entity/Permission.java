package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "iam_permissions")
@NoArgsConstructor
public class Permission extends BaseEntity {

    @Column(nullable = false, unique = true, length = 64)
    private String name;

    @Column(length = 255)
    private String description;
}
