package com.example.backend_instagram.dto.follow;

import com.example.backend_instagram.entity.User;
import lombok.Getter;
import lombok.Setter;

/**
 * Safe public user summary returned by follow endpoints (no PII/secrets).
 */
@Getter
@Setter
public class FollowUserSummaryDTO {

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

    public static FollowUserSummaryDTO from(User user) {
        if (user == null) {
            return null;
        }
        FollowUserSummaryDTO dto = new FollowUserSummaryDTO();
        dto.setId(user.getId());
        dto.setUserFullname(user.getUserFullname());
        dto.setUserNickname(user.getUserNickname());
        dto.setUserImage(user.getUserImage());
        dto.setUserBio(user.getUserBio());
        dto.setIsOnline(user.getIsOnline());
        return dto;
    }
}
