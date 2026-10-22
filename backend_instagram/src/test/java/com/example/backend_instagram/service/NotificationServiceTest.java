package com.example.backend_instagram.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.backend_instagram.entity.Notification;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.event.NotificationCreatedEvent;
import com.example.backend_instagram.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private NotificationWebSocketService notificationWebSocketService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private UserService userService;

    @Mock
    private PostService postService;

    private NotificationService notificationService;
    private Post post;
    private User actor;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(
                notificationRepository,
                notificationWebSocketService,
                eventPublisher,
                userService,
                postService);

        User owner = new User();
        owner.setId(1L);
        owner.setUserNickname("owner");

        actor = new User();
        actor.setId(2L);
        actor.setUserNickname("actor");

        post = new Post();
        post.setId(10L);
        post.setUser(owner);
    }

    @Test
    void persistsNotificationAndPublishesEvent() {
        when(postService.getPostById(10L)).thenReturn(post);
        when(userService.fetchUserById(2L)).thenReturn(actor);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification notification = invocation.getArgument(0);
            notification.setNotificationId(99L);
            return notification;
        });

        notificationService.createCommentNotification(10L, 2L, "hay quá");

        verify(notificationRepository).save(any(Notification.class));
        verify(eventPublisher).publishEvent(any(NotificationCreatedEvent.class));
    }

    @Test
    void keepsNotificationWhenEventPublishingFails() {
        when(postService.getPostById(10L)).thenReturn(post);
        when(userService.fetchUserById(2L)).thenReturn(actor);
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> {
            Notification notification = invocation.getArgument(0);
            notification.setNotificationId(99L);
            return notification;
        });
        doThrow(new RuntimeException("broker down"))
                .when(eventPublisher)
                .publishEvent(any(NotificationCreatedEvent.class));

        assertThatCode(() -> notificationService.createCommentNotification(10L, 2L, "hay quá"))
                .doesNotThrowAnyException();

        verify(notificationRepository).save(any(Notification.class));
    }
}
