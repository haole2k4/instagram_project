package com.example.backend_instagram.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.entity.UserStatus;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.utils.constant.CacheNames;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

@ExtendWith(MockitoExtension.class)
class AccountStatusServiceTest {

  @Mock
  private UserRepository userRepository;

  @Mock
  private AuditService auditService;

  @Mock
  private CacheManager cacheManager;

  private AccountStatusService service;

  @BeforeEach
  void setUp() {
    service = new AccountStatusService(userRepository, auditService, cacheManager);
  }

  @Test
  void expireSuspensionsDoesNotEvictCachesWhenNoUsersExpired() {
    when(userRepository.findByStatusAndSuspendedUntilBefore(any(), any())).thenReturn(List.of());

    service.expireSuspensions();

    verifyNoInteractions(cacheManager);
    verifyNoInteractions(auditService);
    verify(userRepository, never()).save(any());
  }

  @Test
  void expireSuspensionsEvictsCachesAndLogsAuditWhenUsersExpired() {
    User expired = new User();
    expired.setId(42L);
    expired.setStatus(UserStatus.SUSPENDED);
    expired.setSuspendedUntil(Instant.now().minusSeconds(60));

    Cache postsCache = mock(Cache.class);
    Cache commentsCache = mock(Cache.class);
    Cache statsCache = mock(Cache.class);
    when(cacheManager.getCache(CacheNames.POSTS)).thenReturn(postsCache);
    when(cacheManager.getCache(CacheNames.COMMENTS)).thenReturn(commentsCache);
    when(cacheManager.getCache(CacheNames.USER_STATS)).thenReturn(statsCache);
    when(userRepository.findByStatusAndSuspendedUntilBefore(any(), any()))
      .thenReturn(List.of(expired));

    service.expireSuspensions();

    assertThat(expired.getStatus()).isEqualTo(UserStatus.ACTIVE);
    assertThat(expired.getSuspendedUntil()).isNull();
    verify(userRepository).save(expired);
    verify(auditService).log(
      null,
      "ACCOUNT_SUSPENSION_EXPIRED",
      "USER",
      42L,
      null,
      "SYSTEM",
      "Đình chỉ tạm thời đã hết hạn",
      null
    );
    verify(postsCache).clear();
    verify(commentsCache).clear();
    verify(statsCache).clear();
  }

  @Test
  void effectiveStatusTreatsPastSuspensionAsActive() {
    User user = new User();
    user.setStatus(UserStatus.SUSPENDED);
    user.setSuspendedUntil(Instant.now().minusSeconds(5));

    assertThat(service.effectiveStatus(user)).isEqualTo(UserStatus.ACTIVE);
    assertThat(service.isRestricted(user)).isFalse();
  }

  @Test
  void effectiveStatusKeepsFutureSuspensionRestricted() {
    User user = new User();
    user.setStatus(UserStatus.SUSPENDED);
    user.setSuspendedUntil(Instant.now().plusSeconds(3600));

    assertThat(service.effectiveStatus(user)).isEqualTo(UserStatus.SUSPENDED);
    assertThat(service.isRestricted(user)).isTrue();
  }
}
