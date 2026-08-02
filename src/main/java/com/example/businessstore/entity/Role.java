package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "iam_roles")
@NoArgsConstructor
public class Role extends BaseEntity {

    @Column(nullable = false, unique = true, length = 64)
    private String name;

    @Column(length = 255)
    private String description;

    @OneToMany(mappedBy = "role", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<RolePermission> rolePermissions = new LinkedHashSet<>();
}
