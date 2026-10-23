package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/stats")
@PreAuthorize("hasAnyRole('MODERATOR','ADMIN')")
public class AdminDashboardController {
  private final DashboardService dashboardService;

  public AdminDashboardController(DashboardService dashboardService) {
    this.dashboardService = dashboardService;
  }

  @GetMapping("/overview")
  public ResponseEntity<AdminDtos.Dashboard> overview(
    @RequestParam(defaultValue = "7") int days
  ) {
    return ResponseEntity.ok(dashboardService.overview(days));
  }
}
