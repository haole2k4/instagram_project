package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.entity.AuditLog;
import com.example.backend_instagram.repository.AuditLogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {
  private final AuditLogRepository auditLogRepository;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public AuditLogService(AuditLogRepository auditLogRepository) {
    this.auditLogRepository = auditLogRepository;
  }

  @Transactional(readOnly = true)
  public Page<AdminDtos.AuditView> list(
    Long actorId,
    String action,
    String targetType,
    Long targetId,
    Instant from,
    Instant to,
    int page,
    int size
  ) {
    Specification<AuditLog> spec = (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      if (actorId != null) {
        predicates.add(cb.equal(root.get("actorId"), actorId));
      }
      if (action != null && !action.isBlank()) {
        predicates.add(cb.equal(root.get("action"), action));
      }
      if (targetType != null && !targetType.isBlank()) {
        predicates.add(cb.equal(root.get("targetType"), targetType.toUpperCase()));
      }
      if (targetId != null) {
        predicates.add(cb.equal(root.get("targetId"), targetId));
      }
      if (from != null) {
        predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
      }
      if (to != null) {
        predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
      }
      return cb.and(predicates.toArray(new Predicate[0]));
    };
    PageRequest pageable = PageRequest.of(
      Math.max(page, 0),
      Math.min(Math.max(size, 1), 100),
      Sort.by(Sort.Direction.DESC, "createdAt")
    );
    return auditLogRepository.findAll(spec, pageable).map(this::toView);
  }

  private AdminDtos.AuditView toView(AuditLog log) {
    Object metadata = null;
    if (log.getMetadata() != null) {
      try {
        metadata = objectMapper.readValue(log.getMetadata(), Object.class);
      } catch (Exception ignored) {
        metadata = log.getMetadata();
      }
    }
    return new AdminDtos.AuditView(
      log.getId(),
      log.getActorId(),
      log.getActorLabel(),
      log.getAction(),
      log.getTargetType(),
      log.getTargetId(),
      log.getReportId(),
      log.getReasonCode(),
      log.getReasonText(),
      metadata,
      log.getIp(),
      log.getCreatedAt()
    );
  }
}
