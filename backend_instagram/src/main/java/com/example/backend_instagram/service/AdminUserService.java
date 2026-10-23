package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.entity.ReasonCode;
import com.example.backend_instagram.entity.ReportTargetType;
import com.example.backend_instagram.entity.RoleCode;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.entity.UserStatus;
import com.example.backend_instagram.repository.PostRepository;
import com.example.backend_instagram.repository.ReportRepository;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.utils.SecurityUntil;
import com.example.backend_instagram.utils.constant.CacheNames;
import com.example.backend_instagram.utils.error.ApiException;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminUserService {
  private static final Set<Integer> SUSPEND_PRESETS = Set.of(1, 3, 7, 30);

  private final UserRepository userRepository;
  private final PostRepository postRepository;
  private final ReportRepository reportRepository;
  private final CurrentUserService currentUserService;
  private final AccountStatusService accountStatusService;
  private final AuditService auditService;
  private final NotificationService notificationService;

  public AdminUserService(
    UserRepository userRepository,
    PostRepository postRepository,
    ReportRepository reportRepository,
    CurrentUserService currentUserService,
    AccountStatusService accountStatusService,
    AuditService auditService,
    NotificationService notificationService
  ) {
    this.userRepository = userRepository;
    this.postRepository = postRepository;
    this.reportRepository = reportRepository;
    this.currentUserService = currentUserService;
    this.accountStatusService = accountStatusService;
    this.auditService = auditService;
    this.notificationService = notificationService;
  }

  @Transactional(readOnly = true)
  public Page<AdminDtos.UserSummary> list(
    String q,
    String status,
    String role,
    int page,
    int size
  ) {
    Specification<User> spec = (root, query, cb) -> {
      query.distinct(true);
      List<Predicate> predicates = new ArrayList<>();
      if (q != null && !q.isBlank()) {
        String like = "%" + q.trim().toLowerCase() + "%";
        predicates.add(
          cb.or(
            cb.like(cb.lower(root.get("userNickname")), like),
            cb.like(cb.lower(root.get("userFullname")), like),
            cb.like(cb.lower(root.get("userEmail")), like)
          )
        );
      }
      if (status != null && !status.isBlank()) {
        String normalized = status.toUpperCase();
        if ("ACTIVE".equals(normalized)) {
          predicates.add(
            cb.or(
              cb.equal(root.get("status"), UserStatus.ACTIVE),
              cb.and(
                cb.equal(root.get("status"), UserStatus.SUSPENDED),
                cb.lessThanOrEqualTo(root.get("suspendedUntil"), Instant.now())
              )
            )
          );
        } else if ("SUSPENDED".equals(normalized)) {
          predicates.add(cb.equal(root.get("status"), UserStatus.SUSPENDED));
          predicates.add(cb.greaterThan(root.get("suspendedUntil"), Instant.now()));
        } else if ("BANNED".equals(normalized)) {
          predicates.add(cb.equal(root.get("status"), UserStatus.BANNED));
        }
      }
      if (role != null && !role.isBlank()) {
        Join<User, com.example.backend_instagram.entity.Role> roleJoin = root.join("roles");
        predicates.add(cb.equal(roleJoin.get("code"), RoleCode.valueOf(role.toUpperCase())));
      }
      return cb.and(predicates.toArray(new Predicate[0]));
    };

    Page<User> users = userRepository.findAll(
      spec,
      PageRequest.of(
        Math.max(page, 0),
        Math.min(Math.max(size, 1), 100),
        Sort.by(Sort.Direction.DESC, "createdAt")
      )
    );
    boolean admin = SecurityUntil.hasRole("ADMIN");
    return users.map(user -> toSummary(user, admin));
  }

  @Transactional(readOnly = true)
  public AdminDtos.UserDetail get(Long id) {
    User user = findUser(id);
    boolean admin = SecurityUntil.hasRole("ADMIN");
    List<AdminDtos.ReportBrief> reports = reportRepository
      .findByTargetTypeAndTargetIdOrderByCreatedAtDesc(ReportTargetType.USER, id)
      .stream()
      .limit(10)
      .map(report ->
        new AdminDtos.ReportBrief(
          report.getId(),
          report.getTargetType().name(),
          report.getTargetId(),
          report.getReasonCode().name(),
          report.getStatus().name(),
          report.getCreatedAt()
        )
      )
      .toList();
    return new AdminDtos.UserDetail(
      user.getId(),
      user.getUserNickname(),
      user.getUserFullname(),
      maybeMask(user.getUserEmail(), admin),
      admin ? user.getUserPhone() : null,
      user.getUserImage(),
      user.getUserBio(),
      rolesOf(user),
      accountStatusService.effectiveStatus(user).name(),
      user.getSuspendedUntil(),
      user.getStatusReasonCode() == null ? null : user.getStatusReasonCode().name(),
      user.getStatusReason(),
      user.getStatusChangedAt(),
      user.getCreatedAt(),
      postRepository.countByUserId(id),
      reportRepository.countByTargetTypeAndTargetId(ReportTargetType.USER, id),
      reports
    );
  }

  @Transactional
  @Caching(
    evict = {
      @CacheEvict(cacheNames = CacheNames.POSTS, allEntries = true),
      @CacheEvict(cacheNames = CacheNames.COMMENTS, allEntries = true),
      @CacheEvict(cacheNames = CacheNames.USER_STATS, allEntries = true),
    }
  )
  public AdminDtos.UserDetail suspend(
    Long id,
    AdminDtos.SuspendRequest request
  ) {
    if (!SUSPEND_PRESETS.contains(request.durationDays())) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "VALIDATION_ERROR",
        "Thời hạn đình chỉ chỉ nhận 1, 3, 7 hoặc 30 ngày."
      );
    }
    User actor = currentUserService.requireCurrentUser();
    User target = findUser(id);
    assertCanModerate(actor, target);
    if (target.getStatus() == UserStatus.BANNED) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "ACCOUNT_ALREADY_BANNED",
        "Tài khoản đang bị ban vĩnh viễn. Hãy khôi phục trước."
      );
    }
    assertNotLastAdmin(target);

    target.setStatus(UserStatus.SUSPENDED);
    target.setSuspendedUntil(Instant.now().plus(request.durationDays(), ChronoUnit.DAYS));
    target.setStatusReasonCode(request.reasonCode());
    target.setStatusReason(trim(request.note()));
    target.setStatusChangedAt(Instant.now());
    target.setStatusChangedBy(actor.getId());
    userRepository.save(target);

    auditService.log(
      actor,
      "USER_SUSPEND",
      "USER",
      target.getId(),
      null,
      request.reasonCode().name(),
      trim(request.note()),
      java.util.Map.of("durationDays", request.durationDays())
    );
    notify(target, actor, "Tài khoản của bạn đã bị đình chỉ tạm thời " + request.durationDays() + " ngày.");
    return get(id);
  }

  @Transactional
  @Caching(
    evict = {
      @CacheEvict(cacheNames = CacheNames.POSTS, allEntries = true),
      @CacheEvict(cacheNames = CacheNames.COMMENTS, allEntries = true),
      @CacheEvict(cacheNames = CacheNames.USER_STATS, allEntries = true),
    }
  )
  public AdminDtos.UserDetail ban(Long id, AdminDtos.BanRequest request) {
    User actor = currentUserService.requireCurrentUser();
    User target = findUser(id);
    assertCanModerate(actor, target);
    assertNotLastAdmin(target);
    if (target.getStatus() == UserStatus.BANNED) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "ACCOUNT_ALREADY_BANNED",
        "Tài khoản đã bị ban."
      );
    }

    target.setStatus(UserStatus.BANNED);
    target.setSuspendedUntil(null);
    target.setStatusReasonCode(request.reasonCode());
    target.setStatusReason(trim(request.note()));
    target.setStatusChangedAt(Instant.now());
    target.setStatusChangedBy(actor.getId());
    userRepository.save(target);

    auditService.log(
      actor,
      "USER_BAN",
      "USER",
      target.getId(),
      null,
      request.reasonCode().name(),
      trim(request.note()),
      null
    );
    notify(target, actor, "Tài khoản của bạn đã bị khóa vĩnh viễn.");
    return get(id);
  }

  @Transactional
  @Caching(
    evict = {
      @CacheEvict(cacheNames = CacheNames.POSTS, allEntries = true),
      @CacheEvict(cacheNames = CacheNames.COMMENTS, allEntries = true),
      @CacheEvict(cacheNames = CacheNames.USER_STATS, allEntries = true),
    }
  )
  public AdminDtos.UserDetail restore(Long id, AdminDtos.RestoreRequest request) {
    User actor = currentUserService.requireCurrentUser();
    User target = findUser(id);
    assertCanModerate(actor, target);
    UserStatus effective = accountStatusService.effectiveStatus(target);
    if (effective == UserStatus.ACTIVE) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "ACCOUNT_ALREADY_ACTIVE",
        "Tài khoản đang hoạt động."
      );
    }

    target.setStatus(UserStatus.ACTIVE);
    target.setSuspendedUntil(null);
    target.setStatusReasonCode(request.reasonCode());
    target.setStatusReason(trim(request.note()));
    target.setStatusChangedAt(Instant.now());
    target.setStatusChangedBy(actor.getId());
    userRepository.save(target);

    auditService.log(
      actor,
      "USER_RESTORE",
      "USER",
      target.getId(),
      null,
      request.reasonCode().name(),
      trim(request.note()),
      null
    );
    notify(target, actor, "Tài khoản của bạn đã được khôi phục.");
    return get(id);
  }

  /** Dùng cho seed/CLI: không được làm mất admin active cuối cùng. */
  @Transactional
  public void assertNotLastAdmin(User target) {
    if (target == null || !target.hasRole(RoleCode.ADMIN)) {
      return;
    }
    if (accountStatusService.effectiveStatus(target) != UserStatus.ACTIVE) {
      return;
    }
    if (userRepository.findActiveAdminsForUpdate().size() <= 1) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "LAST_ADMIN",
        "Không thể thay đổi admin đang hoạt động cuối cùng."
      );
    }
  }

  private void assertCanModerate(User actor, User target) {
    if (actor.getId().equals(target.getId())) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "FORBIDDEN",
        "Không thể tự tác động lên tài khoản của mình."
      );
    }
    if (target.hasRole(RoleCode.ADMIN)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "FORBIDDEN",
        "Tài khoản admin chỉ được thay đổi bằng seed/CLI."
      );
    }
    if (target.hasRole(RoleCode.MODERATOR) && !actor.hasRole(RoleCode.ADMIN)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "FORBIDDEN",
        "Moderator không thể tác động lên tài khoản moderator khác."
      );
    }
  }

  private User findUser(Long id) {
    return userRepository
      .findById(id)
      .orElseThrow(() ->
        new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại.")
      );
  }

  private AdminDtos.UserSummary toSummary(User user, boolean admin) {
    return new AdminDtos.UserSummary(
      user.getId(),
      user.getUserNickname(),
      user.getUserFullname(),
      maybeMask(user.getUserEmail(), admin),
      user.getUserImage(),
      rolesOf(user),
      accountStatusService.effectiveStatus(user).name(),
      user.getSuspendedUntil(),
      user.getCreatedAt(),
      postRepository.countByUserId(user.getId()),
      reportRepository.countByTargetTypeAndTargetId(ReportTargetType.USER, user.getId())
    );
  }

  private List<String> rolesOf(User user) {
    return user.getRoles() == null
      ? List.of()
      : user.getRoles().stream().map(role -> role.getCode().name()).sorted().toList();
  }

  private String maybeMask(String email, boolean admin) {
    if (email == null || admin) {
      return email;
    }
    int at = email.indexOf('@');
    if (at <= 1) {
      return "***" + (at >= 0 ? email.substring(at) : "");
    }
    return email.substring(0, 1) + "***" + email.substring(at);
  }

  private String trim(String value) {
    return value == null ? null : value.trim();
  }

  private void notify(User target, User actor, String message) {
    try {
      notificationService.createModerationNotification(target, actor, message);
    } catch (Exception ignored) {
      // Notification best-effort; quyết định moderation đã được lưu.
    }
  }

  public ReasonCode reasonOrOther(ReasonCode code) {
    return code == null ? ReasonCode.OTHER : code;
  }
}
