package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.service.AuditLogService;
import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@PreAuthorize("hasRole('ADMIN')")
public class AdminAuditController {
  private final AuditLogService auditLogService;

  public AdminAuditController(AuditLogService auditLogService) {
    this.auditLogService = auditLogService;
  }

  @GetMapping
  public ResponseEntity<Page<AdminDtos.AuditView>> list(
    @RequestParam(required = false) Long actorId,
    @RequestParam(required = false) String action,
    @RequestParam(required = false) String targetType,
    @RequestParam(required = false) Long targetId,
    @RequestParam(required = false) Instant from,
    @RequestParam(required = false) Instant to,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    return ResponseEntity.ok(
      auditLogService.list(actorId, action, targetType, targetId, from, to, page, size)
    );
  }
}
