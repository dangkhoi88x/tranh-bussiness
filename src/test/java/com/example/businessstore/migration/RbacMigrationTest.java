package com.example.businessstore.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.DriverManager;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class RbacMigrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17-alpine");

    @Test
    void migrationPreservesExistingUserRoleInJoinTable() throws Exception {
        flywayAt(MigrationVersion.fromVersion("8")).migrate();

        UUID userId = UUID.randomUUID();
        try (var connection = DriverManager.getConnection(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
             var statement = connection.prepareStatement("""
                     INSERT INTO iam_users (
                         id, created_at, updated_at, email, password_hash, first_name, last_name, role
                     ) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)
                     """)) {
            statement.setObject(1, userId);
            statement.setString(2, "staff@example.com");
            statement.setString(3, "password-hash");
            statement.setString(4, "Store");
            statement.setString(5, "Staff");
            statement.setString(6, "STAFF");
            statement.executeUpdate();
        }

        flywayAt(MigrationVersion.LATEST).migrate();

        try (var connection = DriverManager.getConnection(
                postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())) {
            try (var statement = connection.prepareStatement("""
                    SELECT roles.name
                    FROM iam_user_roles user_roles
                    JOIN iam_roles roles ON roles.id = user_roles.role_id
                    WHERE user_roles.user_id = ?
                    """)) {
                statement.setObject(1, userId);
                try (var result = statement.executeQuery()) {
                    assertThat(result.next()).isTrue();
                    assertThat(result.getString("name")).isEqualTo("STAFF");
                    assertThat(result.next()).isFalse();
                }
            }

            try (var statement = connection.prepareStatement("""
                    SELECT COUNT(*)
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'iam_users'
                      AND column_name = 'role'
                    """);
                 var result = statement.executeQuery()) {
                assertThat(result.next()).isTrue();
                assertThat(result.getInt(1)).isZero();
            }

            try (var statement = connection.prepareStatement("""
                    SELECT confdeltype
                    FROM pg_constraint
                    WHERE conname = 'fk_cart_items_product_frame_option'
                    """);
                 var result = statement.executeQuery()) {
                assertThat(result.next()).isTrue();
                assertThat(result.getString(1)).isEqualTo("c");
            }
        }
    }

    private Flyway flywayAt(MigrationVersion target) {
        return Flyway.configure()
                .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
                .locations("classpath:db/migration")
                .target(target)
                .load();
    }
}
