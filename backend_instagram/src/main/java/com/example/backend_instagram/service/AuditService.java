package com.example.backend_instagram.service;

import com.example.backend_instagram.entity.AuditLog;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
  private final AuditLogRepository auditLogRepository;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public AuditService(AuditLogRepository auditLogRepository) {
    this.auditLogRepository = auditLogRepository;
  }

  public void log(
    User actor,
    String action,
    String targetType,
    Long targetId,
    Long reportId,
    String reasonCode,
    String reasonText,
    Map<String, Object> metadata
  ) {
    AuditLog log = new AuditLog();
    if (actor != null) {
      log.setActorId(actor.getId());
      log.setActorLabel(actor.getUserNickname() + "#" + actor.getId());
    } else {
      log.setActorLabel("SYSTEM");
    }
    log.setAction(action);
    log.setTargetType(targetType);
    log.setTargetId(targetId);
    log.setReportId(reportId);
    log.setReasonCode(reasonCode);
    log.setReasonText(reasonText);
    if (metadata != null && !metadata.isEmpty()) {
      try {
        log.setMetadata(objectMapper.writeValueAsString(metadata));
      } catch (Exception ignored) {
        log.setMetadata(null);
      }
    }
    auditLogRepository.save(log);
  }
}
