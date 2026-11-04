package com.example.backend_instagram.service;

import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserPrivacyService {

    public static final String RESTRICTION_MESSAGE =
            "This account can't receive your message because they don't allow new message requests from everyone";

    private static final String FLAG_NO_STRANGER_MESSAGES = "NO_STRANGERS";
    private final UserRepository userRepository;
    private final Map<Long, Boolean> memoryCache = new ConcurrentHashMap<>();

    public UserPrivacyService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public boolean allowsStrangerMessages(Long userId) {
        if (userId == null) {
            return true;
        }
        Boolean cached = memoryCache.get(userId);
        if (cached != null) {
            return cached;
        }
        return userRepository.findById(userId)
                .map(this::allowsStrangerMessages)
                .orElse(true);
    }

    public boolean allowsStrangerMessages(User user) {
        if (user == null) {
            return true;
        }
        if (user.getId() != null && memoryCache.containsKey(user.getId())) {
            return memoryCache.get(user.getId());
        }
        String socketId = user.getSocketId();
        boolean allows = socketId == null || !socketId.contains(FLAG_NO_STRANGER_MESSAGES);
        if (user.getId() != null) {
            memoryCache.put(user.getId(), allows);
        }
        return allows;
    }

    @Transactional
    public void setAllowStrangerMessages(Long userId, boolean allow) {
        if (userId == null) {
            return;
        }
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            if (allow) {
                user.setSocketId(null);
            } else {
                user.setSocketId(FLAG_NO_STRANGER_MESSAGES);
            }
            userRepository.save(user);
            memoryCache.put(userId, allow);
        }
    }
}
