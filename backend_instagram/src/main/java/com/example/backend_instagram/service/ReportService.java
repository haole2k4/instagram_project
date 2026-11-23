package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.entity.Comment;
import com.example.backend_instagram.entity.ContentAction;
import com.example.backend_instagram.entity.ModerationAction;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.ReasonCode;
import com.example.backend_instagram.entity.Report;
import com.example.backend_instagram.entity.ReportStatus;
import com.example.backend_instagram.entity.ReportTargetType;
import com.example.backend_instagram.entity.RoleCode;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.CommentRepository;
import com.example.backend_instagram.repository.PostRepository;
import com.example.backend_instagram.repository.ReportRepository;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.utils.error.ApiException;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {
  private static final int DAILY_REPORT_LIMIT = 10;
  private static final int MAX_REASON_LENGTH = 500;
  private static final int MAX_REPORT_NOTE_LENGTH = 1000;
  private static final Target DELETED_TARGET = new Target(null, "[Deleted content]");

  private final ReportRepository reportRepository;
  private final PostRepository postRepository;
  private final CommentRepository commentRepository;
  private final UserRepository userRepository;
  private final CurrentUserService currentUserService;
  private final AccountStatusService accountStatusService;
  private final AdminContentService adminContentService;
  private final AdminUserService adminUserService;
  private final AuditService auditService;
  private final NotificationService notificationService;

  public ReportService(
    ReportRepository reportRepository,
    PostRepository postRepository,
    CommentRepository commentRepository,
    UserRepository userRepository,
    CurrentUserService currentUserService,
    AccountStatusService accountStatusService,
    AdminContentService adminContentService,
    AdminUserService adminUserService,
    AuditService auditService,
    NotificationService notificationService
  ) {
    this.reportRepository = reportRepository;
    this.postRepository = postRepository;
    this.commentRepository = commentRepository;
    this.userRepository = userRepository;
    this.currentUserService = currentUserService;
    this.accountStatusService = accountStatusService;
    this.adminContentService = adminContentService;
    this.adminUserService = adminUserService;
    this.auditService = auditService;
    this.notificationService = notificationService;
  }

  @Transactional
  public AdminDtos.ReportView create(AdminDtos.ReportCreateRequest request) {
    User actor = currentUserService.requireCurrentUser();
    accountStatusService.requireWritable(actor);
    Target target = resolveOrThrow(request.targetType(), request.targetId());
    if (target.author() != null && target.author().getId().equals(actor.getId())) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "FORBIDDEN",
        "Không thể báo cáo nội dung hoặc tài khoản của chính mình."
      );
    }
    if (
      reportRepository.existsByReporterIdAndTargetTypeAndTargetId(
        actor.getId(),
        request.targetType(),
        request.targetId()
      )
    ) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "REPORT_ALREADY_EXISTS",
        "Bạn đã báo cáo mục này rồi."
      );
    }
    long today = reportRepository.countByReporterIdAndCreatedAtAfter(
      actor.getId(),
      Instant.now().minus(1, ChronoUnit.DAYS)
    );
    if (today >= DAILY_REPORT_LIMIT) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "REPORT_RATE_LIMIT",
        "Bạn đã gửi quá nhiều báo cáo trong 24 giờ."
      );
    }

    Report report = new Report();
    report.setReporter(actor);
    report.setTargetType(request.targetType());
    report.setTargetId(request.targetId());
    report.setReasonCode(request.reasonCode());
    report.setNote(trimMax(request.note(), MAX_REPORT_NOTE_LENGTH));
    report.setStatus(ReportStatus.OPEN);
    report.setCreatedAt(Instant.now());
    report = reportRepository.save(report);
    return toView(report, target);
  }

  @Transactional(readOnly = true)
  public Page<AdminDtos.ReportView> list(
    String status,
    String targetType,
    String reasonCode,
    String assignee,
    int page,
    int size
  ) {
    Long me = currentUserService.currentUserIdOrNull();
    Specification<Report> spec = (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
        predicates.add(cb.equal(root.get("status"), ReportStatus.valueOf(status.toUpperCase())));
      }
      if (targetType != null && !targetType.isBlank() && !"ALL".equalsIgnoreCase(targetType)) {
        predicates.add(
          cb.equal(root.get("targetType"), ReportTargetType.valueOf(targetType.toUpperCase()))
        );
      }
      if (reasonCode != null && !reasonCode.isBlank() && !"ALL".equalsIgnoreCase(reasonCode)) {
        predicates.add(
          cb.equal(root.get("reasonCode"), ReasonCode.valueOf(reasonCode.toUpperCase()))
        );
      }
      if ("me".equalsIgnoreCase(assignee)) {
        predicates.add(cb.equal(root.get("assignee").get("id"), me));
      } else if ("unassigned".equalsIgnoreCase(assignee)) {
        predicates.add(cb.isNull(root.get("assignee")));
      }
      return cb.and(predicates.toArray(new Predicate[0]));
    };
    PageRequest pageable = PageRequest.of(
      Math.max(page, 0),
      Math.min(Math.max(size, 1), 100),
      Sort.by(Sort.Direction.ASC, "createdAt")
    );
    return reportRepository.findAll(spec, pageable).map(this::toView);
  }

  @Transactional(readOnly = true)
  public AdminDtos.ReportView get(Long id) {
    return toView(findReport(id));
  }

  @Transactional
  public AdminDtos.ReportView claim(Long id) {
    User actor = currentUserService.requireCurrentUser();
    Report report = findReport(id);
    Target target = resolveForView(report.getTargetType(), report.getTargetId());
    assertNotOwnReport(actor, report, target);
    if (report.getStatus() != ReportStatus.OPEN) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "REPORT_ALREADY_CLAIMED",
        "Báo cáo đã được nhận hoặc đã xử lý."
      );
    }
    int updated = reportRepository.claim(id, actor, Instant.now());
    if (updated == 0) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "REPORT_ALREADY_CLAIMED",
        "Báo cáo đã được người khác nhận."
      );
    }
    auditService.log(
      actor,
      "REPORT_CLAIM",
      "REPORT",
      report.getId(),
      report.getId(),
      null,
      null,
      null
    );
    return toView(findReport(id), target);
  }

  @Transactional
  public AdminDtos.ReportView decide(Long id, AdminDtos.DecisionRequest request) {
    User actor = currentUserService.requireCurrentUser();
    Report report = findReport(id);
    Optional<Target> targetOpt = resolveOptional(report.getTargetType(), report.getTargetId());
    Target viewTarget = targetOpt.orElse(DELETED_TARGET);
    assertNotOwnReport(actor, report, viewTarget);
    if (report.getStatus() == ReportStatus.RESOLVED || report.getStatus() == ReportStatus.DISMISSED) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "REPORT_ALREADY_DECIDED",
        "Báo cáo đã được xử lý."
      );
    }
    if (report.getAssignee() != null && !report.getAssignee().getId().equals(actor.getId())) {
      if (!actor.hasRole(RoleCode.ADMIN)) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          "FORBIDDEN",
          "Báo cáo đang được moderator khác xử lý."
        );
      }
    }

    applyAction(report, targetOpt, request, actor);

    String decisionNote = trimMax(request.note(), MAX_REPORT_NOTE_LENGTH);
    report.setStatus(
      request.action() == ModerationAction.DISMISS ? ReportStatus.DISMISSED : ReportStatus.RESOLVED
    );
    report.setAction(request.action());
    report.setDecisionNote(decisionNote);
    report.setDecidedBy(actor);
    report.setDecidedAt(Instant.now());
    if (report.getAssignee() == null) {
      report.setAssignee(actor);
      report.setClaimedAt(Instant.now());
    }
    reportRepository.save(report);

    auditService.log(
      actor,
      "REPORT_DECIDE",
      "REPORT",
      report.getId(),
      report.getId(),
      request.reasonCode().name(),
      decisionNote,
      java.util.Map.of("action", request.action().name())
    );

    try {
      notificationService.createModerationNotification(
        report.getReporter(),
        actor,
        "Báo cáo của bạn đã được xử lý: " + request.action().name() + "."
      );
    } catch (Exception ignored) {
      // Notification best-effort.
    }
    return toView(report, viewTarget);
  }

  private void applyAction(
    Report report,
    Optional<Target> targetOpt,
    AdminDtos.DecisionRequest request,
    User actor
  ) {
    String boundedReason = trimMax(request.note(), MAX_REASON_LENGTH);
    switch (request.action()) {
      case DISMISS -> {}
      case HIDE_CONTENT -> {
        if (report.getTargetType() != ReportTargetType.POST &&
            report.getTargetType() != ReportTargetType.COMMENT) {
          throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "INVALID_ACTION",
            "Chỉ có thể ẩn bài viết hoặc bình luận."
          );
        }
        if (targetOpt.isEmpty()) {
          throw targetNotFound(report.getTargetType());
        }
        adminContentService.moderate(
          report.getTargetType().name(),
          report.getTargetId(),
          new AdminDtos.ModerateRequest(ContentAction.HIDE, request.reasonCode(), boundedReason)
        );
      }
      case SUSPEND_USER -> {
        if (request.durationDays() == null) {
          throw new ApiException(
            HttpStatus.BAD_REQUEST,
            "VALIDATION_ERROR",
            "Cần chọn thời hạn đình chỉ."
          );
        }
        Target target = targetOpt.orElseThrow(() -> targetNotFound(report.getTargetType()));
        adminUserService.suspend(
          requireTargetUser(target).getId(),
          new AdminDtos.SuspendRequest(
            request.reasonCode(),
            boundedReason,
            request.durationDays()
          )
        );
      }
      case BAN_USER -> {
        if (!actor.hasRole(RoleCode.ADMIN)) {
          throw new ApiException(
            HttpStatus.FORBIDDEN,
            "FORBIDDEN",
            "Chỉ admin được ban vĩnh viễn."
          );
        }
        Target target = targetOpt.orElseThrow(() -> targetNotFound(report.getTargetType()));
        adminUserService.ban(
          requireTargetUser(target).getId(),
          new AdminDtos.BanRequest(request.reasonCode(), boundedReason)
        );
      }
    }
  }

  private User requireTargetUser(Target target) {
    if (target.author() == null) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "INVALID_ACTION",
        "Không xác định được chủ thể để xử lý."
      );
    }
    return target.author();
  }

  private Target resolveOrThrow(ReportTargetType type, Long id) {
    if (type == ReportTargetType.STORY) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "INVALID_TARGET_TYPE",
        "Báo cáo story chưa được hỗ trợ trong phiên bản này."
      );
    }
    return resolveOptional(type, id).orElseThrow(() -> targetNotFound(type));
  }

  private Target resolveForView(ReportTargetType type, Long id) {
    return resolveOptional(type, id).orElse(DELETED_TARGET);
  }

  private Optional<Target> resolveOptional(ReportTargetType type, Long id) {
    return switch (type) {
      case POST -> postRepository
        .findById(id)
        .map(post -> new Target(post.getUser(), truncate(post.getTitle())));
      case COMMENT -> commentRepository
        .findById(id)
        .map(comment -> new Target(comment.getUser(), truncate(comment.getContent())));
      case USER -> userRepository
        .findById(id)
        .map(user -> new Target(user, user.getUserNickname()));
      case STORY -> Optional.empty();
    };
  }

  private ApiException targetNotFound(ReportTargetType type) {
    String message = switch (type) {
      case POST -> "Bài viết không tồn tại.";
      case COMMENT -> "Bình luận không tồn tại.";
      case USER -> "Người dùng không tồn tại.";
      case STORY -> "Story không tồn tại.";
    };
    return new ApiException(HttpStatus.NOT_FOUND, "TARGET_NOT_FOUND", message);
  }

  private void assertNotOwnReport(User actor, Report report, Target target) {
    if (report.getReporter().getId().equals(actor.getId())) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "FORBIDDEN",
        "Không thể xử lý báo cáo do chính mình gửi."
      );
    }
    if (target != null && target.author() != null && target.author().getId().equals(actor.getId())) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "FORBIDDEN",
        "Không thể xử lý báo cáo về nội dung hoặc tài khoản của mình."
      );
    }
  }

  private Report findReport(Long id) {
    return reportRepository
      .findById(id)
      .orElseThrow(() ->
        new ApiException(HttpStatus.NOT_FOUND, "REPORT_NOT_FOUND", "Báo cáo không tồn tại.")
      );
  }

  private AdminDtos.ReportView toView(Report report) {
    return toView(report, resolveForView(report.getTargetType(), report.getTargetId()));
  }

  private AdminDtos.ReportView toView(Report report, Target target) {
    return new AdminDtos.ReportView(
      report.getId(),
      report.getTargetType().name(),
      report.getTargetId(),
      target.preview(),
      target.author() == null ? null : target.author().getId(),
      target.author() == null ? null : target.author().getUserNickname(),
      report.getReporter().getId(),
      report.getReporter().getUserNickname(),
      report.getReasonCode().name(),
      report.getNote(),
      report.getStatus().name(),
      report.getAssignee() == null ? null : report.getAssignee().getId(),
      report.getAssignee() == null ? null : report.getAssignee().getUserNickname(),
      report.getClaimedAt(),
      report.getAction() == null ? null : report.getAction().name(),
      report.getDecisionNote(),
      report.getDecidedBy() == null ? null : report.getDecidedBy().getId(),
      report.getDecidedBy() == null ? null : report.getDecidedBy().getUserNickname(),
      report.getDecidedAt(),
      report.getCreatedAt()
    );
  }

  private String truncate(String value) {
    if (value == null) {
      return "";
    }
    return value.length() <= 160 ? value : value.substring(0, 157) + "...";
  }

  private String trimMax(String value, int maxLength) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
  }

  private record Target(User author, String preview) {}
}
