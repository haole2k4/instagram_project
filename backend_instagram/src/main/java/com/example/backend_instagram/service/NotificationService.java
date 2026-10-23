package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.notification.NotificationDTO;
import com.example.backend_instagram.entity.Notification;
import com.example.backend_instagram.entity.NotificationType;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.event.NotificationCreatedEvent;
import com.example.backend_instagram.repository.NotificationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class NotificationService {
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final NotificationWebSocketService notificationWebSocketService;
    private final ApplicationEventPublisher eventPublisher;
    private final UserService userService;
    private final PostService postService;
    private final ObjectMapper objectMapper;

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
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    public List<Notification> getAllNotifications() {
        return notificationRepository.findAll();
    }

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

    public void markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        if (notification.getUser() == null || !notification.getUser().getId().equals(userId)) {
            throw new com.example.backend_instagram.utils.error.ApiException(
                    org.springframework.http.HttpStatus.FORBIDDEN,
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
      
          String message = actor.getUserNickname() + " liked your post";
          Notification notification = new Notification(receiver, actor, post, NotificationType.LIKE, message);
          notificationRepository.save(notification);
          NotificationDTO notificationDTO = toDTO(notification);
          logger.info("Created like notification for user: {}, post: {}, {}",
              receiver.getId(), postId, notificationDTO);
          publishNotificationCreated(notification, receiver.getId());
      
          // Gửi like update chỉ tới receiver
          LikeUpdateDTO likeUpdateDTO = new LikeUpdateDTO(
              postId,
              post.getLikesCount(),
              message,
              actor.getUserNickname(),
              actor.getUserImage(),
              receiver.getId(), // receiverId
              actor.getId() // actorId
          );
          sendLikeUpdateToUser(receiver.getId(), likeUpdateDTO);
        } catch (Exception e) {
          logger.error("Error creating like notification: {}", e.getMessage(), e);
        }
      }

      private void sendLikeUpdateToUser(Long userId, LikeUpdateDTO likeUpdateDTO) {
        try {
          notificationWebSocketService.sendNotificationToUser(userId, likeUpdateDTO);
          logger.info("Like update sent to user: {} via STOMP", userId);
        } catch (Exception e) {
          logger.error("Error sending like update via WebSocket: {}", e.getMessage(), e);
        }
      }

    public void createCommentNotification(Long postId, Long actorId, String commentContent) {
        try {
            Post post = postService.getPostById(postId);
            User actor = userService.fetchUserById(actorId);
            User receiver = post.getUser();

            if (!receiver.getId().equals(actorId)) {
                String message = actor.getUserNickname() + " commented: " + truncateComment(commentContent, 50);
                Notification notification = new Notification(receiver, actor, post, NotificationType.COMMENT, message);
                notificationRepository.save(notification);
                logger.info("Created comment notification for user: {}, post: {}", receiver.getId(), postId);
                publishNotificationCreated(notification, receiver.getId());
            } else {
                logger.debug("Skipping comment notification as actorId equals receiverId: {}", actorId);
            }
        } catch (Exception e) {
            logger.error("Error creating comment notification: {}", e.getMessage(), e);
        }
    }

    public void createModerationNotification(User receiver, User actor, String message) {
        try {
            Notification notification = new Notification(
                    receiver,
                    actor,
                    null,
                    NotificationType.MODERATION,
                    message);
            notificationRepository.save(notification);
            publishNotificationCreated(notification, receiver.getId());
        } catch (Exception e) {
            logger.error("Error creating moderation notification: {}", e.getMessage(), e);
        }
    }

    private void publishNotificationCreated(Notification notification, Long recipientId) {
        NotificationCreatedEvent event = new NotificationCreatedEvent(
                UUID.randomUUID().toString(),
                NotificationCreatedEvent.CURRENT_VERSION,
                Instant.now(),
                notification.getNotificationId(),
                recipientId,
                toDTO(notification));
        eventPublisher.publishEvent(event);
    }
    // private void broadcastLikeUpdate(Long postId, Integer likesCount, String message, String userNickname,
    //         String userImage) {
    //     socketIOServer.getBroadcastOperations()
    //             .sendEvent("like_update", new LikeUpdateDTO(postId, likesCount, message, userNickname, userImage));
    //     logger.info("Broadcast like update: postId={}, likesCount={}, message={}, userNickname={}, userImage={}",
    //             postId, likesCount, message, userNickname, userImage);
    // }

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

class LikeUpdateDTO {
  private Long postId;
  private Integer likesCount;
  private String message;
  private String userNickname;
  private String userImage;
  private Long receiverId;
  private Long actorId; 

  public LikeUpdateDTO(Long postId, Integer likesCount, String message, String userNickname, String userImage, Long receiverId, Long actorId) {
    this.postId = postId;
    this.likesCount = likesCount;
    this.message = message;
    this.userNickname = userNickname;
    this.userImage = userImage;
    this.receiverId = receiverId;
    this.actorId = actorId;
  }

  // Getters và setters
  public Long getReceiverId() {
    return receiverId;
  }

  public void setReceiverId(Long receiverId) {
    this.receiverId = receiverId;
  }

  public Long getActorId() {
    return actorId;
  }

  public void setActorId(Long actorId) {
    this.actorId = actorId;
  }

    public Long getPostId() {
        return postId;
    }

    public void setPostId(Long postId) {
        this.postId = postId;
    }

    public Integer getLikesCount() {
        return likesCount;
    }

    public void setLikesCount(Integer likesCount) {
        this.likesCount = likesCount;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getUserNickname() {
        return userNickname;
    }

    public void setUserNickname(String userNickname) {
        this.userNickname = userNickname;
    }

    public String getUserImage() {
        return userImage;
    }

    public void setUserImage(String userImage) {
        this.userImage = userImage;
    }
}