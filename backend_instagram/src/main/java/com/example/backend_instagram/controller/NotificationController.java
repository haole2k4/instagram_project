package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.notification.NotificationDTO;
import com.example.backend_instagram.service.NotificationService;
import com.example.backend_instagram.utils.SecurityUntil;
import com.example.backend_instagram.utils.error.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notification")
public class NotificationController {

  private final NotificationService notificationService;

  public NotificationController(NotificationService notificationService) {
    this.notificationService = notificationService;
  }

  @GetMapping("/user/{userId}")
  public ResponseEntity<List<NotificationDTO>> getNotificationsByUserId(
    @PathVariable Long userId
  ) {
    requireSelf(userId);
    return ResponseEntity.ok(notificationService.getNotificationsByUserId(userId));
  }

  @GetMapping("/user/{userId}/unread")
  public ResponseEntity<List<NotificationDTO>> getUnreadNotificationsByUserId(
    @PathVariable Long userId
  ) {
    requireSelf(userId);
    return ResponseEntity.ok(notificationService.getUnreadNotificationsByUserId(userId));
  }

  @PutMapping("/{notificationId}/read")
  public ResponseEntity<Void> markNotificationAsRead(@PathVariable Long notificationId) {
    notificationService.markAsRead(notificationId, currentUserId());
    return ResponseEntity.ok().build();
  }

  private void requireSelf(Long userId) {
    if (!currentUserId().equals(userId)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "FORBIDDEN",
        "Không thể xem thông báo của người khác."
      );
    }
  }

  private Long currentUserId() {
    return SecurityUntil
      .getCurrentUserId()
      .orElseThrow(() ->
        new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Authentication required")
      );
  }
}
