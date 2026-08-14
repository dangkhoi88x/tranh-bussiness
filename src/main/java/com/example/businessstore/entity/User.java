package com.example.businessstore.entity;

import com.example.businessstore.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "iam_users")
@NoArgsConstructor
public class User extends BaseEntity implements UserDetails {

    @Column(nullable = false, unique = true, length = 320)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @Column(length = 30)
    private String phone;

    @Column(name = "google_subject", unique = true, length = 255)
    private String googleSubject;

    @Column(nullable = false)
    private boolean enabled = true;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<UserRole> userRoles = new LinkedHashSet<>();

    public void addRole(Role role) {
        boolean alreadyAssigned = userRoles.stream()
                .map(UserRole::getRole)
                .filter(Objects::nonNull)
                .anyMatch(existingRole -> existingRole.getName().equalsIgnoreCase(role.getName()));
        if (alreadyAssigned) {
            return;
        }

        UserRole userRole = new UserRole();
        userRole.setUser(this);
        userRole.setRole(role);
        userRoles.add(userRole);
    }

    public Set<String> getRoleNames() {
        Set<String> roleNames = new LinkedHashSet<>();
        userRoles.stream()
                .map(UserRole::getRole)
                .filter(Objects::nonNull)
                .map(Role::getName)
                .filter(Objects::nonNull)
                .forEach(roleNames::add);
        return roleNames;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Set<String> authorities = new LinkedHashSet<>();
        userRoles.stream()
                .map(UserRole::getRole)
                .filter(Objects::nonNull)
                .forEach(role -> {
                    if (role.getName() != null) {
                        authorities.add("ROLE_" + role.getName());
                    }
                    role.getRolePermissions().stream()
                            .map(RolePermission::getPermission)
                            .filter(Objects::nonNull)
                            .map(Permission::getName)
                            .filter(Objects::nonNull)
                            .forEach(authorities::add);
                });
        return authorities.stream().map(SimpleGrantedAuthority::new).toList();
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
