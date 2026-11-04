package com.example.backend_instagram.service;

import com.example.backend_instagram.entity.Conversation;
import com.example.backend_instagram.entity.ConversationParticipant;
import com.example.backend_instagram.entity.Follow;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.ConversationParticipantRepository;
import com.example.backend_instagram.repository.ConversationRepository;
import com.example.backend_instagram.repository.FollowRepository;
import com.example.backend_instagram.repository.MessageRepository;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.utils.error.IdInvalidException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.List;

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

        // Sender follows recipient, but recipient DOES NOT follow sender
        Follow senderFollowsRecipient = new Follow();
        senderFollowsRecipient.setFollower(sender);
        senderFollowsRecipient.setFollowing(recipient);
        senderFollowsRecipient.setBlocking(false);

        when(followRepository.findBetweenUsers(senderId, recipientId))
                .thenReturn(List.of(senderFollowsRecipient));

        // Recipient has disabled stranger messages
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

        // Recipient follows sender
        Follow recipientFollowsSender = new Follow();
        recipientFollowsSender.setFollower(recipient);
        recipientFollowsSender.setFollowing(sender);
        recipientFollowsSender.setBlocking(false);

        when(followRepository.findBetweenUsers(senderId, recipientId))
                .thenReturn(List.of(recipientFollowsSender));

        when(userPrivacyService.allowsStrangerMessages(recipientId)).thenReturn(false);

        com.example.backend_instagram.entity.Message saved = new com.example.backend_instagram.entity.Message();
        saved.setId(500L);
        saved.setSender(sender);
        saved.setConversation(conv);
        saved.setContent("Hello friend!");

        when(messageRepository.save(any())).thenReturn(saved);

        messageService.sendMessage(convId, senderId, "Hello friend!");

        verify(messageRepository).save(any());
    }
}
