package com.example.businessstore.configuration;

import com.example.businessstore.constant.RoleName;
import com.example.businessstore.entity.Role;
import com.example.businessstore.entity.User;
import com.example.businessstore.repository.RoleRepository;
import com.example.businessstore.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAccountBootstrapTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private PlatformTransactionManager transactionManager;

    private Role adminRole;

    @BeforeEach
    void setUp() {
        adminRole = new Role();
        adminRole.setName(RoleName.ADMIN.name());
    }

    private AdminAccountBootstrap bootstrapWith(BootstrapAdminProperties properties) {
        return new AdminAccountBootstrap(
                properties, userRepository, roleRepository, passwordEncoder,
                new TransactionTemplate(transactionManager));
    }

    private BootstrapAdminProperties properties(String email, String password, boolean resetPassword) {
        return new BootstrapAdminProperties(email, password, null, null, resetPassword);
    }

    private User existingAccount(String hash) {
        User user = new User();
        user.setEmail("owner@tranh.vn");
        user.setPasswordHash(hash);
        user.setFirstName("Chủ");
        user.setLastName("Cửa hàng");
        return user;
    }

    @Test
    void doesNothingWhenNoEmailIsConfigured() {
        bootstrapWith(properties("  ", "Str0ngPassword!", false)).run(null);

        verify(roleRepository, never()).findByNameIgnoreCase(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void createsTheAdministratorWhenTheAccountDoesNotExist() {
        when(roleRepository.findByNameIgnoreCase(RoleName.ADMIN.name())).thenReturn(Optional.of(adminRole));
        when(userRepository.findByEmail("owner@tranh.vn")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("Str0ngPassword!")).thenReturn("hashed");

        bootstrapWith(properties("  Owner@Tranh.VN ", "Str0ngPassword!", false)).run(null);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getEmail()).isEqualTo("owner@tranh.vn");
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("hashed");
        assertThat(saved.getValue().getRoleNames()).containsExactly(RoleName.ADMIN.name());
        assertThat(saved.getValue().isEnabled()).isTrue();
    }

    @Test
    void grantsAdminToAnExistingAccountWithoutTouchingItsPassword() {
        when(roleRepository.findByNameIgnoreCase(RoleName.ADMIN.name())).thenReturn(Optional.of(adminRole));
        when(userRepository.findByEmail("owner@tranh.vn")).thenReturn(Optional.of(existingAccount("chosen-by-the-owner")));

        bootstrapWith(properties("owner@tranh.vn", "Str0ngPassword!", false)).run(null);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("chosen-by-the-owner");
        assertThat(saved.getValue().getRoleNames()).containsExactly(RoleName.ADMIN.name());
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void reEnablesAnAdministratorThatWasDisabled() {
        User disabled = existingAccount("chosen-by-the-owner");
        disabled.addRole(adminRole);
        disabled.setEnabled(false);
        when(roleRepository.findByNameIgnoreCase(RoleName.ADMIN.name())).thenReturn(Optional.of(adminRole));
        when(userRepository.findByEmail("owner@tranh.vn")).thenReturn(Optional.of(disabled));

        bootstrapWith(properties("owner@tranh.vn", "Str0ngPassword!", false)).run(null);

        verify(userRepository).save(disabled);
        assertThat(disabled.isEnabled()).isTrue();
    }

    @Test
    void resetsThePasswordOnlyWhenAskedTo() {
        when(roleRepository.findByNameIgnoreCase(RoleName.ADMIN.name())).thenReturn(Optional.of(adminRole));
        when(userRepository.findByEmail("owner@tranh.vn")).thenReturn(Optional.of(existingAccount("forgotten")));
        when(passwordEncoder.encode("Str0ngPassword!")).thenReturn("rehashed");

        bootstrapWith(properties("owner@tranh.vn", "Str0ngPassword!", true)).run(null);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("rehashed");
    }

    @Test
    void refusesToCreateAnAdministratorWithAWeakPassword() {
        when(roleRepository.findByNameIgnoreCase(RoleName.ADMIN.name())).thenReturn(Optional.of(adminRole));
        when(userRepository.findByEmail("owner@tranh.vn")).thenReturn(Optional.empty());

        AdminAccountBootstrap bootstrap = bootstrapWith(properties("owner@tranh.vn", "short", false));

        assertThatThrownBy(() -> bootstrap.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("between 12 and 72 characters");
        verify(userRepository, never()).save(any());
    }

    @Test
    void retriesOnceWhenAnotherInstanceInsertsTheSameEmailFirst() {
        User insertedByTheOtherInstance = existingAccount("chosen-by-the-owner");
        when(roleRepository.findByNameIgnoreCase(RoleName.ADMIN.name())).thenReturn(Optional.of(adminRole));
        when(userRepository.findByEmail("owner@tranh.vn"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(insertedByTheOtherInstance));
        when(passwordEncoder.encode("Str0ngPassword!")).thenReturn("hashed");
        when(userRepository.save(any()))
                .thenThrow(new DataIntegrityViolationException("uq_iam_users_email"))
                .thenAnswer(invocation -> invocation.getArgument(0));

        bootstrapWith(properties("owner@tranh.vn", "Str0ngPassword!", false)).run(null);

        verify(userRepository, times(2)).save(any());
        assertThat(insertedByTheOtherInstance.getRoleNames()).containsExactly(RoleName.ADMIN.name());
    }
}
