package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.service.AdminUserService;
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
@RequestMapping("/api/v1/admin/users")
@PreAuthorize("hasAnyRole('MODERATOR','ADMIN')")
public class AdminUserController {
  private final AdminUserService adminUserService;

  public AdminUserController(AdminUserService adminUserService) {
    this.adminUserService = adminUserService;
  }

  @GetMapping
  public ResponseEntity<Page<AdminDtos.UserSummary>> list(
    @RequestParam(required = false) String q,
    @RequestParam(required = false) String status,
    @RequestParam(required = false) String role,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    return ResponseEntity.ok(adminUserService.list(q, status, role, page, size));
  }

  @GetMapping("/{id}")
  public ResponseEntity<AdminDtos.UserDetail> get(@PathVariable Long id) {
    return ResponseEntity.ok(adminUserService.get(id));
  }

  @PostMapping("/{id}/suspend")
  public ResponseEntity<AdminDtos.UserDetail> suspend(
    @PathVariable Long id,
    @Valid @RequestBody AdminDtos.SuspendRequest request
  ) {
    return ResponseEntity.ok(adminUserService.suspend(id, request));
  }

  @PostMapping("/{id}/ban")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<AdminDtos.UserDetail> ban(
    @PathVariable Long id,
    @Valid @RequestBody AdminDtos.BanRequest request
  ) {
    return ResponseEntity.ok(adminUserService.ban(id, request));
  }

  @PostMapping("/{id}/restore")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<AdminDtos.UserDetail> restore(
    @PathVariable Long id,
    @Valid @RequestBody AdminDtos.RestoreRequest request
  ) {
    return ResponseEntity.ok(adminUserService.restore(id, request));
  }
}
