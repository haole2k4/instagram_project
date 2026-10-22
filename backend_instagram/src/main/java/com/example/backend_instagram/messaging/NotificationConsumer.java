package com.example.backend_instagram.messaging;

import com.example.backend_instagram.config.RabbitMessagingConfig;
import com.example.backend_instagram.event.NotificationCreatedEvent;
import com.example.backend_instagram.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Đẩy notification realtime. Message có thể bị redeliver (at-least-once), nên
 * consumer chỉ push khi {@code pushed_at} còn null.
 */
@Component
@ConditionalOnProperty(name = "app.messaging.enabled", havingValue = "true", matchIfMissing = true)
public class NotificationConsumer {

    private static final Logger log = LoggerFactory.getLogger(NotificationConsumer.class);

    static final String NOTIFICATION_DESTINATION = "/queue/notifications";

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationConsumer(NotificationRepository notificationRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @RabbitListener(queues = RabbitMessagingConfig.NOTIFICATION_QUEUE)
    @Transactional
    public void onNotification(NotificationCreatedEvent event) {
        if (event == null || event.notificationId() == null || event.recipientId() == null
                || event.payload() == null) {
            log.warn("Notification event không hợp lệ, chuyển DLQ: {}", event);
            throw new AmqpRejectAndDontRequeueException("Invalid notification event");
        }

        int updated = notificationRepository.markPushed(event.notificationId());
        if (updated == 0) {
            log.debug("Bỏ qua notification event trùng hoặc đã bị xoá: eventId={}, notificationId={}",
                    event.eventId(), event.notificationId());
            return;
        }

        messagingTemplate.convertAndSendToUser(
                event.recipientId().toString(),
                NOTIFICATION_DESTINATION,
                event.payload());

        log.info("Đã đẩy notification: eventId={}, notificationId={}, recipientId={}",
                event.eventId(), event.notificationId(), event.recipientId());
    }
}
