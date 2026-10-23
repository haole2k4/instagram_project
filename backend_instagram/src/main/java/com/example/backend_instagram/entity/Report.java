package com.example.backend_instagram.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(
  name = "reports",
  uniqueConstraints = @UniqueConstraint(
    name = "uk_report_reporter_target",
    columnNames = { "reporter_id", "target_type", "target_id" }
  ),
  indexes = {
    @Index(name = "idx_reports_status_created", columnList = "status, created_at"),
    @Index(name = "idx_reports_assignee_status", columnList = "assignee_id, status"),
    @Index(name = "idx_reports_target", columnList = "target_type, target_id")
  }
)
@Getter
@Setter
public class Report {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "reporter_id", nullable = false)
  private User reporter;

  @Enumerated(EnumType.STRING)
  @Column(name = "target_type", nullable = false, length = 16)
  private ReportTargetType targetType;

  @Column(name = "target_id", nullable = false)
  private Long targetId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private ReasonCode reasonCode;

  @Column(length = 1000)
  private String note;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private ReportStatus status = ReportStatus.OPEN;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "assignee_id")
  private User assignee;

  private Instant claimedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "decided_by")
  private User decidedBy;

  @Enumerated(EnumType.STRING)
  @Column(length = 32)
  private ModerationAction action;

  @Column(length = 1000)
  private String decisionNote;

  private Instant decidedAt;

  @Column(nullable = false)
  private Instant createdAt;

  @Version
  private Long version;

  @PrePersist
  protected void onCreate() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
