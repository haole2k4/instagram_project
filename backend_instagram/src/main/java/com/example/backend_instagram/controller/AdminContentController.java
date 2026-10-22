package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.service.AdminContentService;
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
@RequestMapping("/api/v1/admin/content")
@PreAuthorize("hasAnyRole('MODERATOR','ADMIN')")
public class AdminContentController {
  private final AdminContentService adminContentService;

  public AdminContentController(AdminContentService adminContentService) {
    this.adminContentService = adminContentService;
  }

  @GetMapping
  public ResponseEntity<Page<AdminDtos.ContentItem>> list(
    @RequestParam(defaultValue = "POST") String type,
    @RequestParam(required = false) String q,
    @RequestParam(required = false, defaultValue = "ALL") String state,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    return ResponseEntity.ok(adminContentService.list(type, q, state, page, size));
  }

  @GetMapping("/{type}/{id}")
  public ResponseEntity<AdminDtos.ContentDetail> get(
    @PathVariable String type,
    @PathVariable Long id
  ) {
    return ResponseEntity.ok(adminContentService.get(type, id));
  }

  @PostMapping("/{type}/{id}/moderate")
  public ResponseEntity<AdminDtos.ContentItem> moderate(
    @PathVariable String type,
    @PathVariable Long id,
    @Valid @RequestBody AdminDtos.ModerateRequest request
  ) {
    return ResponseEntity.ok(adminContentService.moderate(type, id, request));
  }
}
