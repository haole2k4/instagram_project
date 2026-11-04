package com.example.backend_instagram.service;

import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserPrivacyServiceTest {

    @Mock
    private UserRepository userRepository;

    private UserPrivacyService userPrivacyService;

    @BeforeEach
    void setUp() {
        userPrivacyService = new UserPrivacyService(userRepository);
    }

    @Test
    void allowsStrangerMessagesByDefault() {
        User user = new User();
        user.setId(10L);
        user.setSocketId(null);

        when(userRepository.findById(10L)).thenReturn(Optional.of(user));

        assertThat(userPrivacyService.allowsStrangerMessages(10L)).isTrue();
    }

    @Test
    void disallowsStrangerMessagesWhenFlagPresent() {
        User user = new User();
        user.setId(20L);
        user.setSocketId("NO_STRANGERS");

        when(userRepository.findById(20L)).thenReturn(Optional.of(user));

        assertThat(userPrivacyService.allowsStrangerMessages(20L)).isFalse();
    }

    @Test
    void toggleSettingUpdatesUserAndCache() {
        User user = new User();
        user.setId(30L);
        user.setSocketId(null);

        when(userRepository.findById(30L)).thenReturn(Optional.of(user));

        userPrivacyService.setAllowStrangerMessages(30L, false);

        assertThat(user.getSocketId()).isEqualTo("NO_STRANGERS");
        verify(userRepository).save(user);
        assertThat(userPrivacyService.allowsStrangerMessages(30L)).isFalse();

        userPrivacyService.setAllowStrangerMessages(30L, true);
        assertThat(user.getSocketId()).isNull();
        assertThat(userPrivacyService.allowsStrangerMessages(30L)).isTrue();
    }
}
