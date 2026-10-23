package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.service.ReportService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/reports")
@PreAuthorize("hasAnyRole('MODERATOR','ADMIN')")
public class AdminReportController {
  private final ReportService reportService;

  public AdminReportController(ReportService reportService) {
    this.reportService = reportService;
  }

  @GetMapping
  public ResponseEntity<Page<AdminDtos.ReportView>> list(
    @RequestParam(required = false, defaultValue = "OPEN") String status,
    @RequestParam(required = false) String targetType,
    @RequestParam(required = false) String reasonCode,
    @RequestParam(required = false) String assignee,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    return ResponseEntity.ok(
      reportService.list(status, targetType, reasonCode, assignee, page, size)
    );
  }

  @GetMapping("/{id}")
  public ResponseEntity<AdminDtos.ReportView> get(@PathVariable Long id) {
    return ResponseEntity.ok(reportService.get(id));
  }

  @PostMapping("/{id}/claim")
  public ResponseEntity<AdminDtos.ReportView> claim(@PathVariable Long id) {
    return ResponseEntity.ok(reportService.claim(id));
  }

  @PostMapping("/{id}/decision")
  public ResponseEntity<AdminDtos.ReportView> decide(
    @PathVariable Long id,
    @Valid @RequestBody AdminDtos.DecisionRequest request
  ) {
    return ResponseEntity.ok(reportService.decide(id, request));
  }
}
