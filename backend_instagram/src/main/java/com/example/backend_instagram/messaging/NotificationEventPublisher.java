package com.example.backend_instagram.messaging;

import com.example.backend_instagram.config.AsyncConfig;
import com.example.backend_instagram.config.RabbitMessagingConfig;
import com.example.backend_instagram.event.NotificationCreatedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Publish event sau khi transaction commit, trên executor riêng để broker chậm
 * hoặc chết không làm chậm request like/comment.
 */
@Component
@ConditionalOnProperty(name = "app.messaging.enabled", havingValue = "true", matchIfMissing = true)
public class NotificationEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventPublisher.class);

    private final RabbitTemplate rabbitTemplate;
    private final TaskExecutor executor;

    public NotificationEventPublisher(RabbitTemplate rabbitTemplate,
            @Qualifier(AsyncConfig.MESSAGING_EXECUTOR) TaskExecutor executor) {
        this.rabbitTemplate = rabbitTemplate;
        this.executor = executor;
    }

    @TransactionalEventListener(
            phase = TransactionPhase.AFTER_COMMIT,
            fallbackExecution = true)
    public void onNotificationCreated(NotificationCreatedEvent event) {
        try {
            executor.execute(() -> publish(event));
        } catch (RuntimeException e) {
            log.warn("Không thể xếp lịch publish event {}; notification {} vẫn còn trong DB",
                    event.eventId(), event.notificationId(), e);
        }
    }

    void publish(NotificationCreatedEvent event) {
        try {
            CorrelationData correlation = new CorrelationData(event.eventId());
            correlation.getFuture().whenComplete((confirm, error) -> {
                if (error != null) {
                    log.warn("Publish event {} thất bại: {}", event.eventId(), error.getMessage());
                } else if (!confirm.ack()) {
                    log.warn("Broker từ chối event {}: {}", event.eventId(), confirm.reason());
                }
            });

            rabbitTemplate.convertAndSend(
                    RabbitMessagingConfig.EXCHANGE,
                    RabbitMessagingConfig.NOTIFICATION_ROUTING_KEY,
                    event,
                    correlation);

            log.info("Đã publish notification event: eventId={}, notificationId={}, recipientId={}",
                    event.eventId(), event.notificationId(), event.recipientId());
        } catch (Exception e) {
            // Notification đã nằm trong DB; client vẫn đọc được qua REST.
            log.warn("Publish event {} thất bại; notification {} vẫn còn trong DB: {}",
                    event.eventId(), event.notificationId(), e.getMessage());
        }
    }
}
