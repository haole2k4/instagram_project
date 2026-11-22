package com.example.backend_instagram.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.entity.ReasonCode;
import com.example.backend_instagram.entity.Role;
import com.example.backend_instagram.entity.RoleCode;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.entity.UserStatus;
import com.example.backend_instagram.repository.PostRepository;
import com.example.backend_instagram.repository.ReportRepository;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.service.AccountStatusService;
import com.example.backend_instagram.service.AdminUserService;
import com.example.backend_instagram.service.AuditService;
import com.example.backend_instagram.service.CurrentUserService;
import com.example.backend_instagram.service.NotificationService;
import com.example.backend_instagram.utils.error.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

  @Mock
  private UserRepository userRepository;
  @Mock
  private PostRepository postRepository;
  @Mock
  private ReportRepository reportRepository;
  @Mock
  private CurrentUserService currentUserService;
  @Mock
  private AccountStatusService accountStatusService;
  @Mock
  private AuditService auditService;
  @Mock
  private NotificationService notificationService;

  @InjectMocks
  private AdminUserService adminUserService;

  @AfterEach
  void clearContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void cannotChangeLastActiveAdmin() {
    User admin = admin(RoleCode.ADMIN);
    when(accountStatusService.effectiveStatus(admin)).thenReturn(UserStatus.ACTIVE);
    when(userRepository.findActiveAdminsForUpdate(any(Instant.class))).thenReturn(List.of(admin));

    ApiException error = assertThrows(
      ApiException.class,
      () -> adminUserService.assertNotLastAdmin(admin)
    );

    assertEquals(HttpStatus.CONFLICT, error.getStatus());
    assertEquals("LAST_ADMIN", error.getCode());
  }

  @Test
  void canChangeAdminWhenAnotherActiveAdminExists() {
    User admin = admin(RoleCode.ADMIN);
    User other = admin(RoleCode.ADMIN);
    when(accountStatusService.effectiveStatus(admin)).thenReturn(UserStatus.ACTIVE);
    when(userRepository.findActiveAdminsForUpdate(any(Instant.class))).thenReturn(List.of(admin, other));

    assertDoesNotThrow(() -> adminUserService.assertNotLastAdmin(admin));
  }

  @Test
  void nonAdminIsNotBlocked() {
    User user = admin(RoleCode.USER);
    assertDoesNotThrow(() -> adminUserService.assertNotLastAdmin(user));
  }

  @Test
  @SuppressWarnings("unchecked")
  void moderatorListMasksEmailAndClampsReasonOnSuspend() {
    SecurityContextHolder.getContext().setAuthentication(
      new UsernamePasswordAuthenticationToken(
        "mod",
        null,
        List.of(new SimpleGrantedAuthority("ROLE_MODERATOR"))
      )
    );

    User target = admin(RoleCode.USER);
    target.setId(2L);
    target.setUserNickname("linh");
    target.setUserFullname("Linh");
    target.setUserEmail("linh@instagram.local");
    when(accountStatusService.effectiveStatus(target)).thenReturn(UserStatus.ACTIVE);
    when(userRepository.findAll(any(Specification.class), any(Pageable.class)))
      .thenReturn(new PageImpl<>(List.of(target)));

    Page<AdminDtos.UserSummary> result = adminUserService.list("linh", null, null, 0, 20);
    assertThat(result.getContent().get(0).email()).isEqualTo("l***@instagram.local");

    User mod = admin(RoleCode.MODERATOR);
    mod.setId(1L);
    when(currentUserService.requireCurrentUser()).thenReturn(mod);
    when(userRepository.findById(2L)).thenReturn(Optional.of(target));
    when(reportRepository.findByTargetTypeAndTargetIdOrderByCreatedAtDesc(any(), any()))
      .thenReturn(List.of());

    adminUserService.suspend(2L, new AdminDtos.SuspendRequest(ReasonCode.SPAM, "a".repeat(600), 3));
    assertThat(target.getStatusReason()).hasSize(500);
    verify(userRepository).save(target);
  }

  private User admin(RoleCode code) {
    Role role = new Role();
    role.setCode(code);
    User user = new User();
    user.setId(1L);
    user.addRole(role);
    return user;
  }
}
