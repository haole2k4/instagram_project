package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.message.ChatUserSummaryDTO;
import com.example.backend_instagram.dto.message.ConversationDTO;
import com.example.backend_instagram.dto.message.MessageResponseDTO;
import com.example.backend_instagram.dto.message.ParticipantDTO;
import com.example.backend_instagram.entity.Conversation;
import com.example.backend_instagram.entity.ConversationParticipant;
import com.example.backend_instagram.entity.Follow;
import com.example.backend_instagram.entity.Message;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.ConversationParticipantRepository;
import com.example.backend_instagram.repository.ConversationRepository;
import com.example.backend_instagram.repository.FollowRepository;
import com.example.backend_instagram.repository.MessageRepository;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.utils.error.ApiException;
import com.example.backend_instagram.utils.error.IdInvalidException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChatService {

    private final UserRepository userRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final ConversationParticipantRepository participantRepository;
    private final MessageService messageService;
    private final FollowRepository followRepository;
    private final AccountStatusService accountStatusService;
    private final UserPrivacyService userPrivacyService;

    public ChatService(
            UserRepository userRepository,
            ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            ConversationParticipantRepository participantRepository,
            MessageService messageService,
            FollowRepository followRepository,
            AccountStatusService accountStatusService,
            UserPrivacyService userPrivacyService) {
        this.userRepository = userRepository;
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.participantRepository = participantRepository;
        this.messageService = messageService;
        this.followRepository = followRepository;
        this.accountStatusService = accountStatusService;
        this.userPrivacyService = userPrivacyService;
    }

    /**
     * Lấy hoặc tạo mới cuộc trò chuyện giữa hai người dùng
     */
    @Transactional
    public Conversation getOrCreateConversation(Long userId, Long otherUserId) throws IdInvalidException {
        if (userId.equals(otherUserId)) {
            throw new IdInvalidException("Không thể tự chat với chính mình");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IdInvalidException("Người dùng không tồn tại: " + userId));
        User otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new IdInvalidException("Người dùng không tồn tại: " + otherUserId));

        List<Follow> relations = followRepository.findBetweenUsers(userId, otherUserId);
        boolean isBlocking = relations.stream().anyMatch(Follow::isBlocking);

        if (isBlocking) {
            throw new IdInvalidException("Một trong hai người đã chặn, không thể tạo cuộc trò chuyện");
        }

        Optional<Conversation> existingConversation = conversationRepository.findConversationBetweenUsers(userId,
                otherUserId);

        if (existingConversation.isPresent()) {
            Conversation conversation = existingConversation.get();
            conversation.setParticipants(participantRepository.findByConversationId(conversation.getId()));
            return conversation;
        }

        accountStatusService.requireWritable(user);

        Conversation newConversation = new Conversation();
        newConversation.setName("Chat between " + user.getUserNickname() + " and " + otherUser.getUserNickname());
        newConversation.setIsGroupChat(false);
        Conversation savedConversation = conversationRepository.save(newConversation);
        addUserToConversation(savedConversation, user);
        addUserToConversation(savedConversation, otherUser);
        savedConversation.setParticipants(participantRepository.findByConversationId(savedConversation.getId()));
        return savedConversation;
    }

    @Transactional
    public ConversationDTO getOrCreateConversationDTO(Long userId, Long otherUserId) throws IdInvalidException {
        Conversation conversation = getOrCreateConversation(userId, otherUserId);
        return getConversationById(conversation.getId(), userId);
    }

    private void addUserToConversation(Conversation conversation, User user) {
        if (participantRepository.existsByConversationIdAndUserId(conversation.getId(), user.getId())) {
            return;
        }
        ConversationParticipant participant = new ConversationParticipant();
        participant.setConversation(conversation);
        participant.setUser(user);
        participantRepository.save(participant);
    }

    /**
     * Lấy danh sách cuộc trò chuyện của người dùng
     */
    @Transactional(readOnly = true)
    public List<ConversationDTO> getConversationsForUser(Long userId) throws IdInvalidException {
        if (!userRepository.existsById(userId)) {
            throw new IdInvalidException("User not found");
        }

        List<Conversation> conversations = conversationRepository.findConversationsByUserId(userId);
        List<ConversationDTO> result = new ArrayList<>();

        for (Conversation conversation : conversations) {
            List<ConversationParticipant> participants = participantRepository
                    .findByConversationId(conversation.getId());

            List<Follow> directRelations = null;
            if (Boolean.FALSE.equals(conversation.getIsGroupChat()) && participants.size() == 2) {
                Long otherUserId = participants.stream()
                        .map(cp -> cp.getUser().getId())
                        .filter(id -> !id.equals(userId))
                        .findFirst().orElse(null);

                if (otherUserId == null) {
                    continue;
                }

                directRelations = followRepository.findBetweenUsers(userId, otherUserId);
                boolean isBlocking = directRelations.stream().anyMatch(Follow::isBlocking);

                if (isBlocking) {
                    continue; // Ẩn conversation nếu bị block
                }
            }

            ConversationDTO dto = convertToDTO(conversation);
            dto.setParticipants(participants.stream()
                    .map(this::convertToParticipantDTO)
                    .collect(Collectors.toList()));
            applyPrivacyRestrictions(dto, conversation, participants, userId, directRelations);
            result.add(dto);
        }

        return result;
    }

    /**
     * Lấy tin nhắn của một cuộc trò chuyện theo trang
     */
    @Transactional
    public List<MessageResponseDTO> getMessagesPaginated(Long conversationId, Long userId, int page, int size)
            throws IdInvalidException {
        List<ConversationParticipant> participants = participantRepository
                .findWithConversationAndUsersByConversationId(conversationId);
        if (participants.isEmpty()) {
            throw new IdInvalidException("Cuộc trò chuyện không tồn tại");
        }

        boolean isMember = participants.stream()
                .anyMatch(cp -> cp.getUser().getId().equals(userId));
        if (!isMember) {
            throw new IdInvalidException("Người dùng không trong cuộc trò chuyện này");
        }

        Conversation conversation = participants.get(0).getConversation();

        // Cho phép đọc cuộc trò chuyện đã tồn tại miễn không bị chặn (kể cả chat qua allowStrangerMessages).
        if (Boolean.FALSE.equals(conversation.getIsGroupChat()) && participants.size() == 2) {
            Long otherUserId = participants.stream()
                    .map(cp -> cp.getUser().getId())
                    .filter(id -> !id.equals(userId))
                    .findFirst().orElse(null);

            if (otherUserId != null) {
                List<Follow> relations = followRepository.findBetweenUsers(userId, otherUserId);
                boolean isBlocking = relations.stream().anyMatch(Follow::isBlocking);

                if (isBlocking) {
                    throw new IdInvalidException("Một trong hai người đã chặn, không thể xem tin nhắn");
                }
            }
        }

        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize);
        List<Message> messages = messageRepository.findByConversationIdWithPagination(conversationId, pageable);

        messageRepository.markMessagesAsReadInConversation(conversationId, userId);

        return messages.stream()
                .map(messageService::convertToMessageResponseDTO)
                .collect(Collectors.toList());
    }

    private ParticipantDTO convertToParticipantDTO(ConversationParticipant participant) {
        ParticipantDTO dto = new ParticipantDTO();
        dto.setId(participant.getId());
        dto.setUserId(participant.getUser().getId());
        dto.setUserFullname(participant.getUser().getUserFullname());
        dto.setUserNickname(participant.getUser().getUserNickname());
        dto.setUserImage(participant.getUser().getUserImage());
        return dto;
    }

    /**
     * Lấy thông tin cuộc trò chuyện theo ID (chỉ cho thành viên của cuộc trò chuyện).
     */
    @Transactional(readOnly = true)
    public ConversationDTO getConversationById(Long conversationId, Long userId) throws IdInvalidException {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IdInvalidException("Conversation not found"));

        List<ConversationParticipant> participants = participantRepository.findByConversationId(conversationId);
        boolean isMember = userId != null && participants.stream()
                .anyMatch(p -> p.getUser().getId().equals(userId));
        if (!isMember) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "Bạn không phải thành viên của cuộc trò chuyện này.");
        }

        ConversationDTO dto = convertToDTO(conversation);
        dto.setParticipants(participants.stream()
                .map(this::convertToParticipantDTO)
                .collect(Collectors.toList()));
        applyPrivacyRestrictions(dto, conversation, participants, userId, null);
        return dto;
    }

    private void applyPrivacyRestrictions(
            ConversationDTO dto,
            Conversation conversation,
            List<ConversationParticipant> participants,
            Long currentUserId,
            List<Follow> prefetchedRelations) {
        if (Boolean.FALSE.equals(conversation.getIsGroupChat()) && participants.size() == 2) {
            Long otherUserId = participants.stream()
                    .map(cp -> cp.getUser().getId())
                    .filter(id -> !id.equals(currentUserId))
                    .findFirst()
                    .orElse(null);

            if (otherUserId != null) {
                List<Follow> relations = prefetchedRelations != null
                        ? prefetchedRelations
                        : followRepository.findBetweenUsers(currentUserId, otherUserId);
                boolean isBlocking = relations.stream().anyMatch(Follow::isBlocking);

                if (isBlocking) {
                    dto.setCanReceiveMessage(false);
                    dto.setRestrictionMessage("Một trong hai người đã chặn, không thể gửi tin nhắn");
                    return;
                }

                boolean otherAllowsStrangers = userPrivacyService.allowsStrangerMessages(otherUserId);
                boolean otherFollowsCurrent = relations.stream()
                        .anyMatch(f -> f.getFollower().getId().equals(otherUserId)
                                && f.getFollowing().getId().equals(currentUserId));

                if (!otherAllowsStrangers && !otherFollowsCurrent) {
                    dto.setCanReceiveMessage(false);
                    dto.setRestrictionMessage(UserPrivacyService.RESTRICTION_MESSAGE);
                    return;
                }
            }
        }
        dto.setCanReceiveMessage(true);
        dto.setRestrictionMessage(null);
    }

    private ConversationDTO convertToDTO(Conversation conversation) {
        ConversationDTO dto = new ConversationDTO();
        dto.setId(conversation.getId());
        dto.setName(conversation.getName());
        dto.setIsGroupChat(conversation.getIsGroupChat());
        dto.setCreatedAt(conversation.getCreatedAt());
        dto.setUpdatedAt(conversation.getUpdatedAt());
        return dto;
    }

    @Transactional(readOnly = true)
    public List<ChatUserSummaryDTO> getUsersWithConversation(Long userId) {
        List<ConversationParticipant> participations = participantRepository.findByUserId(userId);
        List<ChatUserSummaryDTO> users = new ArrayList<>();
        java.util.Set<Long> seenUserIds = new java.util.HashSet<>();

        for (ConversationParticipant participation : participations) {
            Conversation conv = participation.getConversation();
            if (Boolean.TRUE.equals(conv.getIsGroupChat())) {
                continue;
            }

            List<ConversationParticipant> others = participantRepository.findByConversationId(conv.getId())
                    .stream()
                    .filter(p -> !p.getUser().getId().equals(userId))
                    .collect(Collectors.toList());

            for (ConversationParticipant other : others) {
                User otherUser = other.getUser();
                if (!seenUserIds.add(otherUser.getId())) {
                    continue;
                }

                List<Follow> relations = followRepository.findBetweenUsers(userId, otherUser.getId());
                boolean isBlocking = relations.stream().anyMatch(Follow::isBlocking);

                if (!isBlocking) {
                    users.add(ChatUserSummaryDTO.from(otherUser));
                }
            }
        }

        return users;
    }

    @Transactional
    public Conversation createGroupConversation(String groupName, List<Long> userIds) throws IdInvalidException {
        List<Long> distinctUserIds = userIds == null
                ? List.of()
                : userIds.stream().filter(Objects::nonNull).distinct().toList();
        if (distinctUserIds.size() < 2) {
            throw new IdInvalidException("at least 2 mems");
        }
        Conversation group = new Conversation();
        group.setName(groupName);
        group.setIsGroupChat(true);
        Conversation savedGroup = conversationRepository.save(group);

        for (Long memberId : distinctUserIds) {
            User user = userRepository.findById(memberId)
                    .orElseThrow(() -> new IdInvalidException("not found: " + memberId));
            addUserToConversation(savedGroup, user);
        }
        savedGroup.setParticipants(participantRepository.findByConversationId(savedGroup.getId()));
        return savedGroup;
    }

    @Transactional
    public void addUserToGroup(Long conversationId, Long userId, Long actorId) throws IdInvalidException {
        Conversation group = requireGroupMembership(conversationId, actorId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IdInvalidException("User not found"));
        addUserToConversation(group, user);
    }

    @Transactional
    public void removeUserFromGroup(Long conversationId, Long userId, Long actorId) throws IdInvalidException {
        requireGroupMembership(conversationId, actorId);
        ConversationParticipant participant = participantRepository
                .findByConversationIdAndUserId(conversationId, userId)
                .orElseThrow(() -> new IdInvalidException("User not in group"));
        participantRepository.delete(participant);
    }

    private Conversation requireGroupMembership(Long conversationId, Long actorId) throws IdInvalidException {
        Conversation group = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IdInvalidException("Group not found"));
        if (!Boolean.TRUE.equals(group.getIsGroupChat())) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "Chỉ hỗ trợ thao tác thành viên trên nhóm chat.");
        }
        if (actorId == null || !participantRepository.existsByConversationIdAndUserId(conversationId, actorId)) {
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    "FORBIDDEN",
                    "Bạn không phải thành viên của nhóm chat này.");
        }
        return group;
    }
}
