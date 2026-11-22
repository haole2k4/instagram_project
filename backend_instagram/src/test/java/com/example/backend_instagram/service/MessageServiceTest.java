package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.message.ChatUserSummaryDTO;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MessageServiceTest {

    @Mock
    private MessageRepository messageRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ConversationRepository conversationRepository;
    @Mock
    private ConversationParticipantRepository participantRepository;
    @Mock
    private FollowRepository followRepository;
    @Mock
    private ChatRealtimePublisher realtimePublisher;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private AccountStatusService accountStatusService;
    @Mock
    private UserPrivacyService userPrivacyService;

    private MessageService messageService;

    @BeforeEach
    void setUp() {
        messageService = new MessageService(
                messageRepository,
                userRepository,
                conversationRepository,
                participantRepository,
                followRepository,
                realtimePublisher,
                eventPublisher,
                accountStatusService,
                userPrivacyService);
    }

    @Test
    void rejectsMessageWhenRecipientDisallowsStrangersAndDoesNotFollowSender() {
        Long convId = 100L;
        Long senderId = 1L;
        Long recipientId = 2L;

        User sender = new User();
        sender.setId(senderId);
        sender.setUserNickname("sender");

        User recipient = new User();
        recipient.setId(recipientId);
        recipient.setUserNickname("recipient");

        Conversation conv = new Conversation();
        conv.setId(convId);
        conv.setIsGroupChat(false);

        ConversationParticipant cpSender = new ConversationParticipant();
        cpSender.setId(1L);
        cpSender.setConversation(conv);
        cpSender.setUser(sender);

        ConversationParticipant cpRecipient = new ConversationParticipant();
        cpRecipient.setId(2L);
        cpRecipient.setConversation(conv);
        cpRecipient.setUser(recipient);

        when(participantRepository.findWithConversationAndUsersByConversationId(convId))
                .thenReturn(List.of(cpSender, cpRecipient));

        Follow senderFollowsRecipient = new Follow();
        senderFollowsRecipient.setFollower(sender);
        senderFollowsRecipient.setFollowing(recipient);
        senderFollowsRecipient.setBlocking(false);

        when(followRepository.findBetweenUsers(senderId, recipientId))
                .thenReturn(List.of(senderFollowsRecipient));

        when(userPrivacyService.allowsStrangerMessages(recipientId)).thenReturn(false);

        assertThatThrownBy(() -> messageService.sendMessage(convId, senderId, "Hello!"))
                .isInstanceOf(IdInvalidException.class)
                .hasMessage(UserPrivacyService.RESTRICTION_MESSAGE);

        verify(messageRepository, never()).save(any());
    }

    @Test
    void allowsMessageWhenRecipientFollowsSenderEvenIfStrangersDisallowed() throws IdInvalidException {
        Long convId = 100L;
        Long senderId = 1L;
        Long recipientId = 2L;

        User sender = new User();
        sender.setId(senderId);
        sender.setUserNickname("sender");

        User recipient = new User();
        recipient.setId(recipientId);
        recipient.setUserNickname("recipient");

        Conversation conv = new Conversation();
        conv.setId(convId);
        conv.setIsGroupChat(false);

        ConversationParticipant cpSender = new ConversationParticipant();
        cpSender.setId(1L);
        cpSender.setConversation(conv);
        cpSender.setUser(sender);

        ConversationParticipant cpRecipient = new ConversationParticipant();
        cpRecipient.setId(2L);
        cpRecipient.setConversation(conv);
        cpRecipient.setUser(recipient);

        when(participantRepository.findWithConversationAndUsersByConversationId(convId))
                .thenReturn(List.of(cpSender, cpRecipient));

        Follow recipientFollowsSender = new Follow();
        recipientFollowsSender.setFollower(recipient);
        recipientFollowsSender.setFollowing(sender);
        recipientFollowsSender.setBlocking(false);

        when(followRepository.findBetweenUsers(senderId, recipientId))
                .thenReturn(List.of(recipientFollowsSender));

        when(userPrivacyService.allowsStrangerMessages(recipientId)).thenReturn(false);

        Message saved = new Message();
        saved.setId(500L);
        saved.setSender(sender);
        saved.setConversation(conv);
        saved.setContent("Hello friend!");

        when(messageRepository.save(any())).thenReturn(saved);

        messageService.sendMessage(convId, senderId, "Hello friend!");

        verify(messageRepository).save(any());
    }

    @Test
    void getConversationMarksReadForCurrentUserNotBlindlyUser1AndChecksBlocking() throws IdInvalidException {
        Conversation conv = new Conversation();
        conv.setId(77L);

        User u1 = new User();
        u1.setId(1L);
        u1.setUserNickname("u1");

        Message msg = new Message();
        msg.setId(10L);
        msg.setConversation(conv);
        msg.setSender(u1);
        msg.setContent("hey");

        when(userRepository.existsById(1L)).thenReturn(true);
        when(userRepository.existsById(2L)).thenReturn(true);
        when(followRepository.findBetweenUsers(1L, 2L)).thenReturn(List.of());
        when(conversationRepository.findConversationBetweenUsers(1L, 2L)).thenReturn(Optional.of(conv));
        when(messageRepository.findByConversationId(77L)).thenReturn(List.of(msg));

        List<MessageResponseDTO> result = messageService.getConversation(1L, 2L, 2L);
        assertThat(result).hasSize(1);
        verify(messageRepository).markMessagesAsReadInConversation(77L, 2L);
        verify(messageRepository, never()).markMessagesAsReadInConversation(77L, 1L);

        assertThatThrownBy(() -> messageService.getConversation(1L, 2L, 99L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.FORBIDDEN));

        Follow blocked = new Follow();
        blocked.setBlocking(true);
        when(followRepository.findBetweenUsers(1L, 2L)).thenReturn(List.of(blocked));
        assertThatThrownBy(() -> messageService.getConversation(1L, 2L, 2L))
                .isInstanceOf(IdInvalidException.class);
    }

    @Test
    void getContactsUsesRepositoryQueryAndOmitsPii() throws IdInvalidException {
        User contact = new User();
        contact.setId(2L);
        contact.setUserFullname("Contact Two");
        contact.setUserNickname("c2");
        contact.setUserEmail("c2@example.com");
        contact.setUserPhone("0999");

        when(userRepository.existsById(1L)).thenReturn(true);
        when(messageRepository.findContactsByUserId(1L)).thenReturn(List.of(contact));

        List<ChatUserSummaryDTO> contacts = messageService.getContacts(1L);
        assertThat(contacts).hasSize(1);
        assertThat(contacts.get(0).getUserNickname()).isEqualTo("c2");
        assertThat(ChatUserSummaryDTO.class.getDeclaredFields())
                .extracting(java.lang.reflect.Field::getName)
                .doesNotContain("userEmail", "userPhone", "userPassword", "refreshToken", "socketId");
    }
}
