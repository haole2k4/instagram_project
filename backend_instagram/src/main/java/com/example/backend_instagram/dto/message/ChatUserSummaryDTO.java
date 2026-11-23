package com.example.backend_instagram.dto.message;

import com.example.backend_instagram.entity.User;
import lombok.Getter;
import lombok.Setter;

/**
 * Safe user summary for messaging contacts and conversation users (no PII/secrets).
 */
@Getter
@Setter
public class ChatUserSummaryDTO {

    private Long id;
    private String userFullname;
    private String userNickname;
    private String userImage;
    private String userBio;
    private boolean isOnline;

    public boolean getIsOnline() {
        return isOnline;
    }

    public void setIsOnline(boolean isOnline) {
        this.isOnline = isOnline;
    }

    public static ChatUserSummaryDTO from(User user) {
        if (user == null) {
            return null;
        }
        ChatUserSummaryDTO dto = new ChatUserSummaryDTO();
        dto.setId(user.getId());
        dto.setUserFullname(user.getUserFullname());
        dto.setUserNickname(user.getUserNickname());
        dto.setUserImage(user.getUserImage());
        dto.setUserBio(user.getUserBio());
        dto.setIsOnline(user.getIsOnline());
        return dto;
    }
}
