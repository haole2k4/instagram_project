package com.example.backend_instagram.messaging;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

import com.example.backend_instagram.config.RabbitMessagingConfig;
import com.example.backend_instagram.dto.notification.NotificationDTO;
import com.example.backend_instagram.event.NotificationCreatedEvent;
import java.time.Instant;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.core.task.SyncTaskExecutor;

@ExtendWith(MockitoExtension.class)
class NotificationEventPublisherTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    private NotificationEventPublisher publisher;

    @BeforeEach
    void setUp() {
        publisher = new NotificationEventPublisher(rabbitTemplate, new SyncTaskExecutor());
    }

    @Test
    void publishesToNotificationExchangeWithEventIdAsCorrelationId() {
        NotificationCreatedEvent event = event();

        publisher.onNotificationCreated(event);

        ArgumentCaptor<CorrelationData> correlation = ArgumentCaptor.forClass(CorrelationData.class);
        verify(rabbitTemplate).convertAndSend(
                eq(RabbitMessagingConfig.EXCHANGE),
                eq(RabbitMessagingConfig.NOTIFICATION_ROUTING_KEY),
                eq(event),
                correlation.capture());
        org.assertj.core.api.Assertions.assertThat(correlation.getValue().getId()).isEqualTo("event-1");
    }

    @Test
    void doesNotFailCallerWhenBrokerIsDown() {
        NotificationCreatedEvent event = event();
        doThrow(new AmqpException("broker down"))
                .when(rabbitTemplate)
                .convertAndSend(anyString(), anyString(), any(Object.class), any(CorrelationData.class));

        assertThatCode(() -> publisher.onNotificationCreated(event)).doesNotThrowAnyException();
    }

    private NotificationCreatedEvent event() {
        NotificationDTO payload = new NotificationDTO();
        payload.setNotificationId(10L);
        payload.setUserId(7L);
        payload.setType("LIKE");
        payload.setMessage("Linh liked your post");
        payload.setSentAt(LocalDateTime.now());
        return new NotificationCreatedEvent(
                "event-1",
                NotificationCreatedEvent.CURRENT_VERSION,
                Instant.now(),
                10L,
                7L,
                payload);
    }
}
