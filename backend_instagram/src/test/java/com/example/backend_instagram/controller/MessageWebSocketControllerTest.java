package com.example.backend_instagram.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.backend_instagram.entity.Follow;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.ConversationParticipantRepository;
import com.example.backend_instagram.repository.ConversationRepository;
import com.example.backend_instagram.repository.FollowRepository;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.service.AccountStatusService;
import com.example.backend_instagram.service.ChatRealtimePublisher;
import com.example.backend_instagram.service.MessageService;
import com.example.backend_instagram.service.UserPrivacyService;
import com.example.backend_instagram.utils.error.ApiException;
import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.MessagingException;

@ExtendWith(MockitoExtension.class)
class MessageWebSocketControllerTest {

    @Mock
    private MessageService messageService;

    @Mock
    private ChatRealtimePublisher realtimePublisher;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AccountStatusService accountStatusService;

    @Mock
    private ConversationParticipantRepository conversationParticipantRepository;

    @Mock
    private FollowRepository followRepository;

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private UserPrivacyService userPrivacyService;

    @InjectMocks
    private MessageWebSocketController controller;

    private Principal principal;
    private User user;

    @BeforeEach
    void setUp() {
        principal = () -> "100";
        user = new User();
        user.setId(100L);
        when(userRepository.findById(100L)).thenReturn(Optional.of(user));
    }

    @Test
    void testForwardVideoCall() {
        when(followRepository.findBetweenUsers(100L, 200L)).thenReturn(List.of());
        when(userPrivacyService.allowsStrangerMessages(200L)).thenReturn(true);

        Map<String, Object> payload = new HashMap<>();
        payload.put("action", "offer");
        payload.put("signal", "dummy-sdp");
        payload.put("name", "User 100");
        payload.put("conversationId", "42");
        payload.put("hasVideo", true);

        controller.forwardVideoCall(200L, payload, principal);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(realtimePublisher).sendVideoCallSignal(eq(200L), captor.capture());

        Map<String, Object> sent = captor.getValue();
        assertEquals("100", sent.get("from"));
        assertEquals("200", sent.get("to"));
        assertEquals("offer", sent.get("action"));
        assertEquals("dummy-sdp", sent.get("signal"));
        assertEquals("42", sent.get("conversationId"));
        assertEquals(true, sent.get("hasVideo"));
    }

    @Test
    void rejectsVideoCallWhenBlockedOrStrangersDisallowed() {
        Follow blocked = new Follow();
        blocked.setBlocking(true);
        when(followRepository.findBetweenUsers(100L, 200L)).thenReturn(List.of(blocked));

        assertThrows(
                MessagingException.class,
                () -> controller.forwardVideoCall(200L, Map.of("action", "offer"), principal));
        verify(realtimePublisher, never()).sendVideoCallSignal(any(), any());

        when(followRepository.findBetweenUsers(100L, 201L)).thenReturn(List.of());
        when(userPrivacyService.allowsStrangerMessages(201L)).thenReturn(false);
        when(conversationRepository.findConversationBetweenUsers(100L, 201L)).thenReturn(Optional.empty());

        assertThrows(
                MessagingException.class,
                () -> controller.forwardVideoCall(201L, Map.of("action", "offer"), principal));
        verify(realtimePublisher, never()).sendVideoCallSignal(eq(201L), any());
    }

    @Test
    void testForwardGroupVideoCall() {
        Long conversationId = 55L;
        when(conversationParticipantRepository.existsByConversationIdAndUserId(conversationId, 100L))
                .thenReturn(true);
        when(conversationParticipantRepository.findUserIdsByConversationId(conversationId))
                .thenReturn(List.of(100L, 201L, 202L));

        Map<String, Object> payload = new HashMap<>();
        payload.put("action", "group-call-join");
        payload.put("groupName", "Team Dev");
        payload.put("hasVideo", false);

        controller.forwardGroupVideoCall(conversationId, payload, principal);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, Object>> captor = ArgumentCaptor.forClass(Map.class);
        verify(realtimePublisher).sendVideoCallSignal(eq(201L), captor.capture());
        verify(realtimePublisher).sendVideoCallSignal(eq(202L), captor.capture());

        Map<String, Object> sent = captor.getValue();
        assertEquals("100", sent.get("from"));
        assertEquals("55", sent.get("conversationId"));
        assertEquals("group-call-join", sent.get("action"));
        assertEquals("Team Dev", sent.get("groupName"));
        assertEquals(false, sent.get("hasVideo"));
        assertEquals(true, sent.get("isGroup"));
    }

    @Test
    void forwardNotificationRequiresFollowRelationship() {
        when(followRepository.existsByFollowerIdAndFollowingId(100L, 200L)).thenReturn(false);

        assertThrows(
                MessagingException.class,
                () -> controller.forwardNotification(200L, Map.of("message", "hi"), principal));
        verify(realtimePublisher, never()).sendNotification(any(), any());

        when(followRepository.existsByFollowerIdAndFollowingId(100L, 200L)).thenReturn(true);
        controller.forwardNotification(200L, Map.of("fromUserName", "u100"), principal);
        verify(realtimePublisher).sendNotification(eq(200L), any());
    }

    @Test
    void markAsReadEnforcesWritableAccount() throws Exception {
        doThrow(new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_RESTRICTED", "restricted"))
                .when(accountStatusService).requireWritable(user);

        assertThrows(ApiException.class, () -> controller.markAsRead(10L, principal));
        verify(messageService, never()).markMessagesAsRead(any(), any());
    }
}
