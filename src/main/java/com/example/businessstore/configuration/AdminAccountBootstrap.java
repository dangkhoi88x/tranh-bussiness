package com.example.businessstore.configuration;

import com.example.businessstore.constant.RoleName;
import com.example.businessstore.entity.Role;
import com.example.businessstore.entity.User;
import com.example.businessstore.repository.RoleRepository;
import com.example.businessstore.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Grants the ADMIN role to a configured account on startup outside the development profile.
 *
 * <p>Flyway seeds the roles and permissions but cannot create this account: hashing the
 * password needs the application's {@link PasswordEncoder}. Registration only ever grants
 * CUSTOMER, so without this runner a fresh production database has nobody who can reach
 * {@code /admin} or assign roles to anyone else.
 *
 * <p>The runner is idempotent. An account that already exists keeps its password; only
 * {@code app.bootstrap-admin.reset-password} overwrites it, so leaving the variables set
 * across restarts cannot silently undo a password the administrator has since changed.
 */
@Slf4j
@Component
@Profile("!dev")
@Order(1)
@RequiredArgsConstructor
public class AdminAccountBootstrap implements ApplicationRunner {

    /** Mirrors RegisterRequest so a bootstrap account is never weaker than a self-registered one. */
    private static final int MINIMUM_PASSWORD_LENGTH = 12;

    /** BCrypt silently ignores anything past 72 bytes; reject it instead of trimming the secret. */
    private static final int MAXIMUM_PASSWORD_LENGTH = 72;

    private final BootstrapAdminProperties properties;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate transactionTemplate;

    @Override
    public void run(ApplicationArguments args) {
        if (!properties.configured()) {
            log.info("app.bootstrap-admin.email is not set; skipping the administrator bootstrap.");
            return;
        }

        try {
            bootstrap();
        } catch (DataIntegrityViolationException concurrentInsert) {
            // Another replica inserted the same email between our lookup and the commit. The
            // account now exists, so the retry only has to attach the role.
            log.info("Another instance created {} first; retrying to attach the ADMIN role.", properties.email());
            bootstrap();
        }
    }

    private void bootstrap() {
        transactionTemplate.executeWithoutResult(status -> {
            Role adminRole = roleRepository.findByNameIgnoreCase(RoleName.ADMIN.name())
                    .orElseThrow(() -> new IllegalStateException("ADMIN role was not initialized"));

            User admin = userRepository.findByEmail(properties.email()).orElse(null);
            boolean created = admin == null;
            if (created) {
                admin = new User();
                admin.setEmail(properties.email());
                admin.setFirstName(properties.firstName());
                admin.setLastName(properties.lastName());
                admin.setPasswordHash(passwordEncoder.encode(validatedPassword()));
            } else if (properties.resetPassword()) {
                admin.setPasswordHash(passwordEncoder.encode(validatedPassword()));
            }

            boolean reEnabled = !admin.isEnabled();
            admin.setEnabled(true);

            boolean roleGranted = admin.getRoleNames().stream()
                    .noneMatch(RoleName.ADMIN.name()::equalsIgnoreCase);
            admin.addRole(adminRole);

            userRepository.save(admin);
            report(created, roleGranted, reEnabled);
        });
    }

    private String validatedPassword() {
        String password = properties.password();
        if (password.length() < MINIMUM_PASSWORD_LENGTH || password.length() > MAXIMUM_PASSWORD_LENGTH) {
            throw new IllegalStateException(
                    "app.bootstrap-admin.password must be between %d and %d characters to bootstrap %s."
                            .formatted(MINIMUM_PASSWORD_LENGTH, MAXIMUM_PASSWORD_LENGTH, properties.email()));
        }
        return password;
    }

    private void report(boolean created, boolean roleGranted, boolean reEnabled) {
        if (created) {
            log.warn("Created the bootstrap administrator {}. Sign in and change this password now.", properties.email());
        } else if (properties.resetPassword()) {
            log.warn("Reset the password of {}. Unset app.bootstrap-admin.reset-password before the next restart.",
                    properties.email());
        } else if (roleGranted) {
            log.warn("Granted ADMIN to the existing account {}.", properties.email());
        } else {
            log.info("Administrator {} is already set up; nothing to do.", properties.email());
        }

        if (reEnabled && !created) {
            log.warn("Re-enabled the disabled account {}.", properties.email());
        }
    }
}
