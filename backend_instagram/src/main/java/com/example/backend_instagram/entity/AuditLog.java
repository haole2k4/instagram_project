package com.example.backend_instagram.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(
  name = "audit_logs",
  indexes = {
    @Index(name = "idx_audit_created", columnList = "created_at"),
    @Index(name = "idx_audit_actor", columnList = "actor_id, created_at"),
    @Index(name = "idx_audit_target", columnList = "target_type, target_id"),
    @Index(name = "idx_audit_action", columnList = "action, created_at")
  }
)
@Getter
@Setter
public class AuditLog {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private Long actorId;
  @Column(nullable = false, length = 128)
  private String actorLabel;
  @Column(nullable = false, length = 48)
  private String action;
  @Column(length = 16)
  private String targetType;
  private Long targetId;
  private Long reportId;
  @Column(length = 32)
  private String reasonCode;
  @Column(length = 1000)
  private String reasonText;
  @Column(columnDefinition = "json")
  private String metadata;
  @Column(length = 45)
  private String ip;
  @Column(nullable = false)
  private Instant createdAt;

  @PrePersist
  protected void onCreate() {
    if (createdAt == null) {
      createdAt = Instant.now();
    }
  }
}
