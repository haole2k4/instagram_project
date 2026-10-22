package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.service.ReportService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {
  private final ReportService reportService;

  public ReportController(ReportService reportService) {
    this.reportService = reportService;
  }

  @PostMapping
  public ResponseEntity<AdminDtos.ReportView> create(
    @Valid @RequestBody AdminDtos.ReportCreateRequest request
  ) {
    return ResponseEntity.status(HttpStatus.CREATED).body(reportService.create(request));
  }
}
