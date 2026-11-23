package com.example.backend_instagram.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.backend_instagram.dto.message.ConversationDTO;
import com.example.backend_instagram.dto.message.MessageResponseDTO;
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
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private ConversationRepository conversationRepository;
    @Mock
    private MessageRepository messageRepository;
    @Mock
    private ConversationParticipantRepository participantRepository;
    @Mock
    private MessageService messageService;
    @Mock
    private FollowRepository followRepository;
    @Mock
    private AccountStatusService accountStatusService;
    @Mock
    private UserPrivacyService userPrivacyService;

    private ChatService chatService;
    private User user1;
    private User user2;

    @BeforeEach
    void setUp() {
        chatService = new ChatService(
                userRepository,
                conversationRepository,
                messageRepository,
                participantRepository,
                messageService,
                followRepository,
                accountStatusService,
                userPrivacyService);

        user1 = new User();
        user1.setId(1L);
        user1.setUserNickname("u1");

        user2 = new User();
        user2.setId(2L);
        user2.setUserNickname("u2");
    }

    @Test
    void rejectsNonGroupOrNonParticipantOnAddAndRemove() {
        Conversation dm = new Conversation();
        dm.setId(10L);
        dm.setIsGroupChat(false);
        when(conversationRepository.findById(10L)).thenReturn(Optional.of(dm));

        assertThatThrownBy(() -> chatService.addUserToGroup(10L, 3L, 1L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        Conversation group = new Conversation();
        group.setId(20L);
        group.setIsGroupChat(true);
        when(conversationRepository.findById(20L)).thenReturn(Optional.of(group));
        when(participantRepository.existsByConversationIdAndUserId(20L, 99L)).thenReturn(false);

        assertThatThrownBy(() -> chatService.addUserToGroup(20L, 3L, 99L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        assertThatThrownBy(() -> chatService.removeUserFromGroup(20L, 2L, 99L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void rejectsNonParticipantOnGetConversationById() {
        Conversation conv = new Conversation();
        conv.setId(10L);
        conv.setIsGroupChat(false);

        ConversationParticipant cp = new ConversationParticipant();
        cp.setId(1L);
        cp.setConversation(conv);
        cp.setUser(user1);

        when(conversationRepository.findById(10L)).thenReturn(Optional.of(conv));
        when(participantRepository.findByConversationId(10L)).thenReturn(List.of(cp));

        assertThatThrownBy(() -> chatService.getConversationById(10L, 99L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));
    }

    @Test
    void getMessagesPaginatedAllowsNonFriendsWhenNotBlocked() throws IdInvalidException {
        Conversation conv = new Conversation();
        conv.setId(10L);
        conv.setIsGroupChat(false);

        ConversationParticipant cp1 = new ConversationParticipant();
        cp1.setConversation(conv);
        cp1.setUser(user1);
        ConversationParticipant cp2 = new ConversationParticipant();
        cp2.setConversation(conv);
        cp2.setUser(user2);

        when(participantRepository.findWithConversationAndUsersByConversationId(10L))
                .thenReturn(List.of(cp1, cp2));
        when(followRepository.findBetweenUsers(1L, 2L)).thenReturn(List.of());

        Message msg = new Message();
        msg.setId(5L);
        msg.setSender(user2);
        msg.setConversation(conv);
        msg.setContent("hi stranger");
        when(messageRepository.findByConversationIdWithPagination(org.mockito.ArgumentMatchers.eq(10L), any(Pageable.class)))
                .thenReturn(List.of(msg));
        MessageResponseDTO dto = new MessageResponseDTO();
        dto.setId(5L);
        when(messageService.convertToMessageResponseDTO(msg)).thenReturn(dto);

        List<MessageResponseDTO> result = chatService.getMessagesPaginated(10L, 1L, 0, 20);
        assertThat(result).hasSize(1);
        verify(messageRepository).markMessagesAsReadInConversation(10L, 1L);
    }

    @Test
    void getMessagesPaginatedRejectsBlockedConversation() {
        Conversation conv = new Conversation();
        conv.setId(10L);
        conv.setIsGroupChat(false);
        ConversationParticipant cp1 = new ConversationParticipant();
        cp1.setConversation(conv);
        cp1.setUser(user1);
        ConversationParticipant cp2 = new ConversationParticipant();
        cp2.setConversation(conv);
        cp2.setUser(user2);

        when(participantRepository.findWithConversationAndUsersByConversationId(10L))
                .thenReturn(List.of(cp1, cp2));
        Follow blocked = new Follow();
        blocked.setBlocking(true);
        when(followRepository.findBetweenUsers(1L, 2L)).thenReturn(List.of(blocked));

        assertThatThrownBy(() -> chatService.getMessagesPaginated(10L, 1L, 0, 20))
                .isInstanceOf(IdInvalidException.class);
    }

    @Test
    void getConversationsForUserQueriesFollowBetweenUsersOncePerDirectChat() throws IdInvalidException {
        Conversation conv = new Conversation();
        conv.setId(10L);
        conv.setIsGroupChat(false);
        ConversationParticipant cp1 = new ConversationParticipant();
        cp1.setConversation(conv);
        cp1.setUser(user1);
        ConversationParticipant cp2 = new ConversationParticipant();
        cp2.setConversation(conv);
        cp2.setUser(user2);

        when(userRepository.existsById(1L)).thenReturn(true);
        when(conversationRepository.findConversationsByUserId(1L)).thenReturn(List.of(conv));
        when(participantRepository.findByConversationId(10L)).thenReturn(List.of(cp1, cp2));
        when(followRepository.findBetweenUsers(1L, 2L)).thenReturn(List.of());
        when(userPrivacyService.allowsStrangerMessages(2L)).thenReturn(true);

        List<ConversationDTO> dtos = chatService.getConversationsForUser(1L);
        assertThat(dtos).hasSize(1);
        verify(followRepository, org.mockito.Mockito.times(1)).findBetweenUsers(1L, 2L);
    }

    @Test
    void createGroupConversationRejectsNullOrEmptyUserIds() {
        assertThatThrownBy(() -> chatService.createGroupConversation("Team", null))
                .isInstanceOf(IdInvalidException.class);
        assertThatThrownBy(() -> chatService.createGroupConversation("Team", List.of()))
                .isInstanceOf(IdInvalidException.class);
    }
}
