package com.example.backend_instagram.service;

import com.example.backend_instagram.entity.AuditLog;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tools.jackson.databind.ObjectMapper;

@Service
public class AuditService {
  private static final int MAX_IP_LENGTH = 45;

  private final AuditLogRepository auditLogRepository;
  private final ObjectMapper objectMapper;

  public AuditService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
    this.auditLogRepository = auditLogRepository;
    this.objectMapper = objectMapper;
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
    log.setIp(resolveClientIp());
    if (metadata != null && !metadata.isEmpty()) {
      try {
        log.setMetadata(objectMapper.writeValueAsString(metadata));
      } catch (Exception ignored) {
        log.setMetadata(null);
      }
    }
    auditLogRepository.save(log);
  }

  private String resolveClientIp() {
    try {
      if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
        HttpServletRequest request = attrs.getRequest();
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
          String first = forwarded.split(",")[0].trim();
          if (!first.isEmpty()) {
            return truncateIp(first);
          }
        }
        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr != null && !remoteAddr.isBlank()) {
          return truncateIp(remoteAddr.trim());
        }
      }
    } catch (Exception ignored) {
      // Best-effort outside web request context
    }
    return null;
  }

  private String truncateIp(String ip) {
    return ip.length() <= MAX_IP_LENGTH ? ip : ip.substring(0, MAX_IP_LENGTH);
  }
}
