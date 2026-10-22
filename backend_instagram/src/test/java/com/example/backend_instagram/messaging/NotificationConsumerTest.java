package com.example.backend_instagram.messaging;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.backend_instagram.dto.notification.NotificationDTO;
import com.example.backend_instagram.event.NotificationCreatedEvent;
import com.example.backend_instagram.repository.NotificationRepository;
import java.time.Instant;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@ExtendWith(MockitoExtension.class)
class NotificationConsumerTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private NotificationConsumer consumer;
    private NotificationDTO payload;

    @BeforeEach
    void setUp() {
        consumer = new NotificationConsumer(notificationRepository, messagingTemplate);
        payload = new NotificationDTO();
        payload.setNotificationId(10L);
        payload.setUserId(7L);
        payload.setActorId(9L);
        payload.setActorNickname("Linh");
        payload.setPostId(42L);
        payload.setType("LIKE");
        payload.setMessage("Linh liked your post");
        payload.setSentAt(LocalDateTime.now());
    }

    @Test
    void pushesWhenNotificationHasNotBeenPushed() {
        when(notificationRepository.markPushed(10L)).thenReturn(1);

        consumer.onNotification(event(10L, 7L, payload));

        verify(messagingTemplate).convertAndSendToUser(
                eq("7"),
                eq(NotificationConsumer.NOTIFICATION_DESTINATION),
                eq(payload));
    }

    @Test
    void skipsDuplicateDelivery() {
        when(notificationRepository.markPushed(10L)).thenReturn(0);

        consumer.onNotification(event(10L, 7L, payload));

        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void rejectsInvalidEventSoItGoesToDlq() {
        assertThatThrownBy(() -> consumer.onNotification(event(null, 7L, payload)))
                .isInstanceOf(org.springframework.amqp.AmqpRejectAndDontRequeueException.class);

        verify(notificationRepository, never()).markPushed(anyLong());
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void rejectsEventWithoutPayload() {
        assertThatThrownBy(() -> consumer.onNotification(event(10L, 7L, null)))
                .isInstanceOf(org.springframework.amqp.AmqpRejectAndDontRequeueException.class);

        verify(notificationRepository, never()).markPushed(anyLong());
        verifyNoInteractions(messagingTemplate);
    }

    @Test
    void propagatesFailureSoMessageIsRetried() {
        when(notificationRepository.markPushed(10L)).thenThrow(new RuntimeException("db down"));

        assertThatThrownBy(() -> consumer.onNotification(event(10L, 7L, payload)))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("db down");

        verify(messagingTemplate, never()).convertAndSendToUser(any(), any(), any());
    }

    private NotificationCreatedEvent event(Long notificationId, Long recipientId, NotificationDTO payload) {
        return new NotificationCreatedEvent(
                "event-1",
                NotificationCreatedEvent.CURRENT_VERSION,
                Instant.now(),
                notificationId,
                recipientId,
                payload);
    }
}
