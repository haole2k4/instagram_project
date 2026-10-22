package com.example.backend_instagram.event;

import com.example.backend_instagram.dto.notification.NotificationDTO;
import java.time.Instant;

/**
 * Event chỉ chứa dữ liệu đã detach khỏi persistence context. Consumer không
 * cần đọc lại DB để dựng payload, tránh ảnh hưởng bởi thời điểm commit.
 */
public record NotificationCreatedEvent(
        String eventId,
        int version,
        Instant occurredAt,
        Long notificationId,
        Long recipientId,
        NotificationDTO payload) {

    public static final int CURRENT_VERSION = 1;
}
