package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.message.ChatSendRequest;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.ConversationParticipantRepository;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.service.AccountStatusService;
import com.example.backend_instagram.service.ChatRealtimePublisher;
import com.example.backend_instagram.service.MessageService;
import com.example.backend_instagram.utils.error.IdInvalidException;
import jakarta.validation.Valid;
import java.security.Principal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

@Controller
public class MessageWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(MessageWebSocketController.class);

    private final MessageService messageService;
    private final ChatRealtimePublisher realtimePublisher;
    private final UserRepository userRepository;
    private final AccountStatusService accountStatusService;
    private final ConversationParticipantRepository conversationParticipantRepository;

    public MessageWebSocketController(MessageService messageService,
            ChatRealtimePublisher realtimePublisher,
            UserRepository userRepository,
            AccountStatusService accountStatusService,
            ConversationParticipantRepository conversationParticipantRepository) {
        this.messageService = messageService;
        this.realtimePublisher = realtimePublisher;
        this.userRepository = userRepository;
        this.accountStatusService = accountStatusService;
        this.conversationParticipantRepository = conversationParticipantRepository;
    }

    /**
     * Gửi tin nhắn qua STOMP. Đây là cùng một write path với REST
     * POST /api/v1/messages, để không còn tình trạng tin nhắn "ma" không lưu DB.
     */
    @MessageMapping("/chat/{conversationId}")
    public void forwardMessage(@DestinationVariable Long conversationId,
            @Payload @Valid ChatSendRequest request,
            Principal principal) throws IdInvalidException {
        messageService.sendMessage(conversationId, currentUserId(principal), request.getContent());
    }

    @MessageMapping("/chat/{conversationId}/read")
    public void markAsRead(@DestinationVariable Long conversationId,
            Principal principal) throws IdInvalidException {
        messageService.markMessagesAsRead(conversationId, currentUserId(principal));
    }

    /**
     * Chuyển tiếp tín hiệu video call (1-1). Chỉ nhận các trường cần thiết và luôn
     * ghi đè người gửi bằng Principal, không tin "from" từ client.
     */
    @MessageMapping("/video-call/{toUserId}")
    public void forwardVideoCall(@DestinationVariable Long toUserId,
            @Payload Map<String, Object> payload,
            Principal principal) {
        Long fromUserId = writableUserId(principal);
        if (toUserId == null || toUserId.equals(fromUserId) || payload == null) {
            return;
        }
        Map<String, Object> safePayload = new HashMap<>();
        safePayload.put("from", fromUserId.toString());
        safePayload.put("to", toUserId.toString());
        safePayload.put("name", payload.getOrDefault("name", ""));
        safePayload.put("action", payload.get("action"));
        safePayload.put("signal", payload.get("signal"));
        safePayload.put("conversationId", payload.get("conversationId"));
        safePayload.put("hasVideo", payload.get("hasVideo"));
        safePayload.put("userImage", payload.get("userImage"));
        safePayload.put("isGroup", payload.get("isGroup"));
        safePayload.put("groupName", payload.get("groupName"));
        safePayload.put("callId", payload.get("callId"));
        realtimePublisher.sendVideoCallSignal(toUserId, safePayload);
    }

    /**
     * Chuyển tiếp tín hiệu call trong nhóm tới tất cả thành viên khác của cuộc trò chuyện.
     */
    @MessageMapping("/video-call/group/{conversationId}")
    public void forwardGroupVideoCall(@DestinationVariable Long conversationId,
            @Payload Map<String, Object> payload,
            Principal principal) {
        Long fromUserId = writableUserId(principal);
        if (conversationId == null || payload == null) {
            return;
        }
        boolean isParticipant = conversationParticipantRepository
                .existsByConversationIdAndUserId(conversationId, fromUserId);
        if (!isParticipant) {
            return;
        }

        List<Long> memberIds = conversationParticipantRepository
                .findUserIdsByConversationId(conversationId);

        Map<String, Object> safePayload = new HashMap<>();
        safePayload.put("from", fromUserId.toString());
        safePayload.put("conversationId", conversationId.toString());
        safePayload.put("name", payload.getOrDefault("name", ""));
        safePayload.put("action", payload.get("action"));
        safePayload.put("signal", payload.get("signal"));
        safePayload.put("hasVideo", payload.get("hasVideo"));
        safePayload.put("userImage", payload.get("userImage"));
        safePayload.put("isGroup", true);
        safePayload.put("groupName", payload.getOrDefault("groupName", ""));
        safePayload.put("callId", payload.get("callId"));

        for (Long memberId : memberIds) {
            if (!memberId.equals(fromUserId)) {
                realtimePublisher.sendVideoCallSignal(memberId, safePayload);
            }
        }
    }

    /**
     * Follow notification gửi từ client. Server chỉ giữ các trường hiển thị cần
     * thiết và ghi đè fromUserId bằng Principal.
     */
    @MessageMapping("/notifications/{toUserId}")
    public void forwardNotification(@DestinationVariable Long toUserId,
            @Payload Map<String, Object> payload,
            Principal principal) {
        Long fromUserId = writableUserId(principal);
        if (toUserId == null || toUserId.equals(fromUserId) || payload == null) {
            return;
        }
        Map<String, Object> safePayload = new HashMap<>();
        safePayload.put("type", "FOLLOW");
        safePayload.put("fromUserId", fromUserId.toString());
        safePayload.put("fromUserName", payload.getOrDefault("fromUserName", ""));
        safePayload.put("message", payload.getOrDefault("message", ""));
        safePayload.put("sentAt", payload.getOrDefault("sentAt", Instant.now().toString()));
        realtimePublisher.sendNotification(toUserId, safePayload);
    }

    @MessageExceptionHandler
    public void handleException(Exception exception, Principal principal) {
        log.warn("STOMP message handling failed: {}", exception.getMessage());
        if (principal == null) {
            return;
        }
        try {
            realtimePublisher.sendError(Long.valueOf(principal.getName()), exception.getMessage());
        } catch (NumberFormatException ignored) {
            log.warn("Unable to resolve userId from STOMP principal");
        }
    }

    private Long writableUserId(Principal principal) {
        Long userId = currentUserId(principal);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new MessagingException("User not found"));
        accountStatusService.requireWritable(user);
        return userId;
    }

    private Long currentUserId(Principal principal) {
        if (principal == null) {
            throw new MessagingException("Unauthenticated STOMP session");
        }
        try {
            return Long.valueOf(principal.getName());
        } catch (NumberFormatException ex) {
            throw new MessagingException("Invalid STOMP principal", ex);
        }
    }
}
