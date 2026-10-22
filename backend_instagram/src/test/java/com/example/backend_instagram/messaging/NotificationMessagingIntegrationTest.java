package com.example.backend_instagram.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

import com.example.backend_instagram.config.TestcontainersConfiguration;
import com.example.backend_instagram.dto.notification.NotificationDTO;
import com.example.backend_instagram.entity.Notification;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.NotificationRepository;
import com.example.backend_instagram.repository.PostRepository;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.service.NotificationService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.rabbitmq.RabbitMQContainer;

@Testcontainers
class NotificationMessagingIntegrationTest extends TestcontainersConfiguration {

    @Container
    static final RabbitMQContainer RABBITMQ = new RabbitMQContainer("rabbitmq:4.4-management-alpine");

    static {
        RABBITMQ.start();
    }

    @DynamicPropertySource
    static void rabbitProperties(DynamicPropertyRegistry registry) {
        registry.add("app.messaging.enabled", () -> "true");
        registry.add("spring.rabbitmq.host", RABBITMQ::getHost);
        registry.add("spring.rabbitmq.port", RABBITMQ::getAmqpPort);
        registry.add("spring.rabbitmq.username", () -> "guest");
        registry.add("spring.rabbitmq.password", () -> "guest");
        registry.add("spring.rabbitmq.virtual-host", () -> "/");
    }

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @MockitoBean
    private SimpMessagingTemplate messagingTemplate;

    @Test
    void commentNotificationIsPersistedThenPushedOnceAndMarked() {
        User recipient = saveUser("recipient");
        User actor = saveUser("actor");
        Post post = savePost(recipient);

        transactionTemplate.executeWithoutResult(status ->
                notificationService.createCommentNotification(post.getId(), actor.getId(), "hay quá"));

        verify(messagingTemplate, timeout(10_000)).convertAndSendToUser(
                eq(recipient.getId().toString()),
                eq(NotificationConsumer.NOTIFICATION_DESTINATION),
                any(NotificationDTO.class));

        List<Notification> notifications = notificationRepository.findByUserOrderBySentAtDesc(recipient);
        assertThat(notifications).hasSize(1);
        assertThat(notifications.get(0).getPushedAt()).isNotNull();
        assertThat(notifications.get(0).getMessage()).contains("commented");
    }

    private User saveUser(String nickname) {
        User user = new User();
        user.setUserNickname(nickname);
        user.setUserFullname(nickname);
        user.setIsOnline(false);
        return userRepository.save(user);
    }

    private Post savePost(User owner) {
        Post post = new Post();
        post.setTitle("test post");
        post.setUser(owner);
        post.setStatus("PUBLIC");
        post.setAccess("PUBLIC");
        post.setLikesCount(0);
        post.setCommentsCount(0L);
        return postRepository.save(post);
    }
}
