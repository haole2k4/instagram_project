package com.example.backend_instagram.dto.admin;

import com.example.backend_instagram.entity.ContentAction;
import com.example.backend_instagram.entity.ModerationAction;
import com.example.backend_instagram.entity.ReasonCode;
import com.example.backend_instagram.entity.ReportStatus;
import com.example.backend_instagram.entity.ReportTargetType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

public final class AdminDtos {

  private AdminDtos() {}

  public record UserSummary(
    Long id,
    String nickname,
    String fullname,
    String email,
    String image,
    List<String> roles,
    String status,
    Instant suspendedUntil,
    LocalDateTime createdAt,
    long postsCount,
    long reportsCount
  ) {}

  public record UserDetail(
    Long id,
    String nickname,
    String fullname,
    String email,
    String phone,
    String image,
    String bio,
    List<String> roles,
    String status,
    Instant suspendedUntil,
    String statusReasonCode,
    String statusReason,
    Instant statusChangedAt,
    LocalDateTime createdAt,
    long postsCount,
    long reportsCount,
    List<ReportBrief> reports
  ) {}

  public record ReportBrief(
    Long id,
    String targetType,
    Long targetId,
    String reasonCode,
    String status,
    Instant createdAt
  ) {}

  public record ReportView(
    Long id,
    String targetType,
    Long targetId,
    String targetPreview,
    Long targetAuthorId,
    String targetAuthorNickname,
    Long reporterId,
    String reporterNickname,
    String reasonCode,
    String note,
    String status,
    Long assigneeId,
    String assigneeNickname,
    Instant claimedAt,
    String action,
    String decisionNote,
    Long decidedById,
    String decidedByNickname,
    Instant decidedAt,
    Instant createdAt
  ) {}

  public record ContentItem(
    Long id,
    String type,
    String preview,
    Long authorId,
    String authorNickname,
    String authorImage,
    String state,
    String reasonCode,
    String reason,
    LocalDateTime createdAt,
    LocalDateTime moderatedAt,
    Long moderatedBy,
    long reportCount
  ) {}

  public record ContentDetail(
    ContentItem item,
    String mediaUrl,
    String mediaType,
    Long parentPostId
  ) {}

  public record AuditView(
    Long id,
    Long actorId,
    String actorLabel,
    String action,
    String targetType,
    Long targetId,
    Long reportId,
    String reasonCode,
    String reasonText,
    Object metadata,
    String ip,
    Instant createdAt
  ) {}

  public record Dashboard(
    long totalUsers,
    long newUsers,
    long newPosts,
    ReportCounts reports,
    List<DayCount> processedByDay,
    Double avgResolutionHours,
    List<ReasonCount> topReasons
  ) {}

  public record ReportCounts(
    long open,
    long claimed,
    long resolved,
    long dismissed
  ) {}

  public record DayCount(String date, long resolved, long dismissed) {}

  public record ReasonCount(String reasonCode, long total) {}

  public record SuspendRequest(
    @NotNull ReasonCode reasonCode,
    @Size(max = 500) String note,
    @Min(1) @Max(30) int durationDays
  ) {}

  public record BanRequest(
    @NotNull ReasonCode reasonCode,
    @Size(max = 500) String note
  ) {}

  public record RestoreRequest(
    @NotNull ReasonCode reasonCode,
    @Size(max = 500) String note
  ) {}

  public record ReportCreateRequest(
    @NotNull ReportTargetType targetType,
    @NotNull Long targetId,
    @NotNull ReasonCode reasonCode,
    @Size(max = 1000) String note
  ) {}

  public record DecisionRequest(
    @NotNull ModerationAction action,
    @NotNull ReasonCode reasonCode,
    @Size(max = 1000) String note,
    Integer durationDays
  ) {}

  public record ModerateRequest(
    @NotNull ContentAction action,
    @NotNull ReasonCode reasonCode,
    @Size(max = 1000) String note
  ) {}
}
