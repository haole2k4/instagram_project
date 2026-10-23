package com.example.backend_instagram.service;

import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.entity.UserStatus;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.utils.constant.CacheNames;
import com.example.backend_instagram.utils.error.ApiException;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountStatusService {
  private static final Logger logger = LoggerFactory.getLogger(AccountStatusService.class);

  private final UserRepository userRepository;
  private final AuditService auditService;

  public AccountStatusService(UserRepository userRepository, AuditService auditService) {
    this.userRepository = userRepository;
    this.auditService = auditService;
  }

  public UserStatus effectiveStatus(User user) {
    if (user == null || user.getStatus() == null) {
      return UserStatus.ACTIVE;
    }
    if (
      user.getStatus() == UserStatus.SUSPENDED &&
      user.getSuspendedUntil() != null &&
      !user.getSuspendedUntil().isAfter(Instant.now())
    ) {
      return UserStatus.ACTIVE;
    }
    return user.getStatus();
  }

  public boolean isRestricted(User user) {
    return effectiveStatus(user) != UserStatus.ACTIVE;
  }

  public void requireWritable(User user) {
    if (isRestricted(user)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "ACCOUNT_RESTRICTED",
        "Tài khoản đang bị hạn chế. Không thể thực hiện hành động này."
      );
    }
  }

  @Scheduled(fixedDelay = 60_000)
  @Transactional
  @Caching(
    evict = {
      @CacheEvict(cacheNames = CacheNames.POSTS, allEntries = true),
      @CacheEvict(cacheNames = CacheNames.COMMENTS, allEntries = true),
      @CacheEvict(cacheNames = CacheNames.USER_STATS, allEntries = true),
    }
  )
  public void expireSuspensions() {
    List<User> expired = userRepository.findByStatusAndSuspendedUntilBefore(
      UserStatus.SUSPENDED,
      Instant.now()
    );
    for (User user : expired) {
      user.setStatus(UserStatus.ACTIVE);
      user.setSuspendedUntil(null);
      user.setStatusChangedAt(Instant.now());
      user.setStatusChangedBy(null);
      userRepository.save(user);
      auditService.log(
        null,
        "ACCOUNT_SUSPENSION_EXPIRED",
        "USER",
        user.getId(),
        null,
        "SYSTEM",
        "Đình chỉ tạm thời đã hết hạn",
        null
      );
      logger.info("Suspension expired for user {}", user.getId());
    }
  }
}
