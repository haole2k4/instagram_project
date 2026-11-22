package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.message.ChatUserSummaryDTO;
import com.example.backend_instagram.dto.message.ConversationDTO;
import com.example.backend_instagram.dto.message.MessageResponseDTO;
import com.example.backend_instagram.entity.Conversation;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.service.AccountStatusService;
import com.example.backend_instagram.service.ChatService;
import com.example.backend_instagram.service.CurrentUserService;
import com.example.backend_instagram.utils.constant.ApiMessage;
import com.example.backend_instagram.utils.error.ApiException;
import com.example.backend_instagram.utils.error.IdInvalidException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private CurrentUserService currentUserService;

    @Autowired
    private AccountStatusService accountStatusService;

    /**
     * Lấy hoặc tạo cuộc trò chuyện giữa hai người dùng
     */
    @GetMapping("/conversation")
    @ApiMessage("Lấy hoặc tạo cuộc trò chuyện thành công")
    public ResponseEntity<ConversationDTO> getOrCreateConversation(
            @RequestParam(required = false) Long userId,
            @RequestParam Long otherUserId) throws IdInvalidException {

        ConversationDTO conversation = chatService.getOrCreateConversationDTO(currentId(), otherUserId);
        return ResponseEntity.ok(conversation);
    }

    /**
     * Tạo cuộc trò chuyện mới giữa hai người dùng (hỗ trợ POST)
     */
    @PostMapping("/conversation")
    @ApiMessage("Tạo cuộc trò chuyện thành công")
    public ResponseEntity<ConversationDTO> createConversation(
            @RequestBody Map<String, Long> requestBody) throws IdInvalidException {

        Long otherUserId = requestBody.get("otherUserId");

        if (otherUserId == null) {
            throw new IdInvalidException("Thiếu otherUserId");
        }

        ConversationDTO conversation = chatService.getOrCreateConversationDTO(currentId(), otherUserId);
        return ResponseEntity.ok(conversation);
    }

    /**
     * Lấy danh sách cuộc trò chuyện của một người dùng
     */
    @GetMapping("/conversations/{userId}")
    @ApiMessage("Lấy danh sách cuộc trò chuyện thành công")
    public ResponseEntity<List<ConversationDTO>> getConversationsForUser(
            @PathVariable Long userId) throws IdInvalidException {

        requireSelf(userId);
        List<ConversationDTO> conversations = chatService.getConversationsForUser(currentId());
        return ResponseEntity.ok(conversations);
    }

    /**
     * Lấy tin nhắn của một cuộc trò chuyện theo trang
     */
    @GetMapping("/messages")
    @ApiMessage("Lấy tin nhắn thành công")
    public ResponseEntity<List<MessageResponseDTO>> getMessagesPaginated(
            @RequestParam Long conversationId,
            @RequestParam Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) throws IdInvalidException {

        List<MessageResponseDTO> messages = chatService.getMessagesPaginated(conversationId, currentId(), page, size);
        return ResponseEntity.ok(messages);
    }

    /**
     * Lấy thông tin chi tiết của một cuộc trò chuyện
     */
    @GetMapping("/conversation/{conversationId}")
    @ApiMessage("Lấy thông tin cuộc trò chuyện thành công")
    public ResponseEntity<ConversationDTO> getConversationById(
            @PathVariable Long conversationId,
            @RequestParam Long userId) throws IdInvalidException {

        ConversationDTO conversation = chatService.getConversationById(conversationId, currentId());
        return ResponseEntity.ok(conversation);
    }

    @GetMapping("/conversationUsers/{userId}")
    public ResponseEntity<List<ChatUserSummaryDTO>> getConversationUsers(@PathVariable Long userId) {
        requireSelf(userId);
        return ResponseEntity.ok(chatService.getUsersWithConversation(currentId()));
    }

    // Nhóm
    @PostMapping("/group")
    @ApiMessage("Tạo group chat thành công")
    public ResponseEntity<Conversation> createGroupConversation(@RequestBody Map<String, Object> requestBody)
            throws IdInvalidException {
        User currentUser = currentUserService.requireCurrentUser();
        accountStatusService.requireWritable(currentUser);

        String groupName = (String) requestBody.get("name");
        Object rawIds = requestBody.get("userIds");
        if (!(rawIds instanceof List<?> userIdsRaw)) {
            throw new IdInvalidException("Thiếu danh sách thành viên userIds");
        }
        List<Long> userIds = new ArrayList<>(userIdsRaw.stream()
                .filter(java.util.Objects::nonNull)
                .map(id -> Long.valueOf(id.toString()))
                .toList());
        if (!userIds.contains(currentUser.getId())) {
            userIds.add(currentUser.getId());
        }
        Conversation group = chatService.createGroupConversation(groupName, userIds);
        return ResponseEntity.ok(group);
    }

    private void requireSelf(Long userId) {
        if (!currentId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "FORBIDDEN",
                    "Không thể xem dữ liệu trò chuyện của người khác.");
        }
    }

    private Long currentId() {
        return currentUserService.requireCurrentUser().getId();
    }

    @PostMapping("/group/{conversationId}/add")
    @ApiMessage("Thêm member mới thành công")
    public ResponseEntity<?> addUserToGroup(@PathVariable Long conversationId, @RequestParam Long userId)
            throws IdInvalidException {
        User actor = currentUserService.requireCurrentUser();
        accountStatusService.requireWritable(actor);
        chatService.addUserToGroup(conversationId, userId, actor.getId());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/group/{conversationId}/remove")
    @ApiMessage("Xóa member thành công")
    public ResponseEntity<?> removeUserFromGroup(@PathVariable Long conversationId, @RequestParam Long userId)
            throws IdInvalidException {
        User actor = currentUserService.requireCurrentUser();
        accountStatusService.requireWritable(actor);
        chatService.removeUserFromGroup(conversationId, userId, actor.getId());
        return ResponseEntity.ok().build();
    }
}
