package com.example.backend_instagram.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

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
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

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

  @Test
  void cannotChangeLastActiveAdmin() {
    User admin = admin(RoleCode.ADMIN);
    when(accountStatusService.effectiveStatus(admin)).thenReturn(UserStatus.ACTIVE);
    when(userRepository.findActiveAdminsForUpdate()).thenReturn(List.of(admin));

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
    when(userRepository.findActiveAdminsForUpdate()).thenReturn(List.of(admin, other));

    assertDoesNotThrow(() -> adminUserService.assertNotLastAdmin(admin));
  }

  @Test
  void nonAdminIsNotBlocked() {
    User user = admin(RoleCode.USER);
    assertDoesNotThrow(() -> adminUserService.assertNotLastAdmin(user));
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
