package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.notification.NotificationDTO;
import com.example.backend_instagram.entity.Notification;
import com.example.backend_instagram.entity.NotificationType;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.event.NotificationCreatedEvent;
import com.example.backend_instagram.repository.NotificationRepository;
import com.example.backend_instagram.utils.error.ApiException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final NotificationWebSocketService notificationWebSocketService;
    private final ApplicationEventPublisher eventPublisher;
    private final UserService userService;
    private final PostService postService;

    public NotificationService(NotificationRepository notificationRepository,
            NotificationWebSocketService notificationWebSocketService,
            ApplicationEventPublisher eventPublisher,
            UserService userService,
            PostService postService) {
        this.notificationRepository = notificationRepository;
        this.notificationWebSocketService = notificationWebSocketService;
        this.eventPublisher = eventPublisher;
        this.userService = userService;
        this.postService = postService;
    }

    public List<Notification> getAllNotifications() {
        return notificationRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<NotificationDTO> getNotificationsByUserId(Long userId) {
        User user = userService.fetchUserById(userId);
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }
        return notificationRepository.findByUserOrderBySentAtDesc(user)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<NotificationDTO> getUnreadNotificationsByUserId(Long userId) {
        User user = userService.fetchUserById(userId);
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }
        return notificationRepository.findByUserAndIsReadFalseOrderBySentAtDesc(user)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (notification.getUser() == null || !notification.getUser().getId().equals(userId)) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "Không thể thay đổi thông báo của người khác.");
        }
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    public void createLikeNotification(Long postId, Long actorId) {
        try {
            Post post = postService.getPostById(postId);
            User actor = userService.fetchUserById(actorId);
            User receiver = post.getUser();

            if (receiver != null && !receiver.getId().equals(actorId)) {
                String message = actor.getUserNickname() + " liked your post";
                Notification notification = new Notification(receiver, actor, post, NotificationType.LIKE, message);
                notificationRepository.save(notification);
                NotificationDTO notificationDTO = toDTO(notification);
                notificationDTO.setLikesCount(post.getLikesCount());
                logger.info("Created like notification for user: {}, post: {}, {}",
                        receiver.getId(), postId, notificationDTO);
                publishNotificationCreated(notification, receiver.getId(), notificationDTO);
            } else {
                logger.debug("Skipping like notification as actorId equals receiverId: {}", actorId);
            }
        } catch (Exception e) {
            logger.error("Error creating like notification: {}", e.getMessage(), e);
        }
    }

    public void createCommentNotification(Long postId, Long actorId, String commentContent) {
        try {
            Post post = postService.getPostById(postId);
            User actor = userService.fetchUserById(actorId);
            User receiver = post.getUser();

            if (receiver != null && !receiver.getId().equals(actorId)) {
                String message = actor.getUserNickname() + " commented: " + truncateComment(commentContent, 50);
                Notification notification = new Notification(receiver, actor, post, NotificationType.COMMENT, message);
                notificationRepository.save(notification);
                logger.info("Created comment notification for user: {}, post: {}", receiver.getId(), postId);
                publishNotificationCreated(notification, receiver.getId(), toDTO(notification));
            } else {
                logger.debug("Skipping comment notification as actorId equals receiverId: {}", actorId);
            }
        } catch (Exception e) {
            logger.error("Error creating comment notification: {}", e.getMessage(), e);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createModerationNotification(User receiver, User actor, String message) {
        try {
            Notification notification = new Notification(
                    receiver,
                    actor,
                    null,
                    NotificationType.MODERATION,
                    message);
            notificationRepository.save(notification);
            publishNotificationCreated(notification, receiver.getId(), toDTO(notification));
        } catch (Exception e) {
            logger.error("Error creating moderation notification: {}", e.getMessage(), e);
        }
    }

    private void publishNotificationCreated(Notification notification, Long recipientId, NotificationDTO dto) {
        NotificationCreatedEvent event = new NotificationCreatedEvent(
                UUID.randomUUID().toString(),
                NotificationCreatedEvent.CURRENT_VERSION,
                Instant.now(),
                notification.getNotificationId(),
                recipientId,
                dto);
        eventPublisher.publishEvent(event);
    }

    private NotificationDTO toDTO(Notification notification) {
        NotificationDTO dto = new NotificationDTO();
        dto.setNotificationId(notification.getNotificationId());
        dto.setUserId(notification.getUser() == null ? null : notification.getUser().getId());
        dto.setActorId(notification.getActor() == null ? null : notification.getActor().getId());
        dto.setActorNickname(
                notification.getActor() == null ? null : notification.getActor().getUserNickname());
        dto.setUserImage(
                notification.getActor() == null ? null : notification.getActor().getUserImage());
        dto.setPostId(notification.getPost() == null ? null : notification.getPost().getId());
        dto.setType(notification.getType().name());
        dto.setMessage(notification.getMessage());
        dto.setRead(notification.isRead());
        dto.setSentAt(notification.getSentAt());
        logger.debug("Created NotificationDTO: {}", dto);
        return dto;
    }

    private String truncateComment(String comment, int maxLength) {
        if (comment == null || comment.length() <= maxLength) {
            return comment;
        }
        return comment.substring(0, maxLength - 3) + "...";
    }
}
