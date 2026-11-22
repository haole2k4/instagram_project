package com.example.backend_instagram.dto.follow;

import com.example.backend_instagram.entity.Follow;
import com.example.backend_instagram.entity.FollowId;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/**
 * Safe follow relationship summary preserving frontend-expected fields without exposing User PII.
 */
@Getter
@Setter
public class FollowSummaryDTO {

    private FollowId id;
    private FollowUserSummaryDTO follower;
    private FollowUserSummaryDTO following;
    private LocalDateTime createdAt;
    private boolean blocking;
    private boolean friend;

    public static FollowSummaryDTO from(Follow follow) {
        if (follow == null) {
            return null;
        }
        FollowSummaryDTO dto = new FollowSummaryDTO();
        dto.setId(follow.getId());
        dto.setFollower(FollowUserSummaryDTO.from(follow.getFollower()));
        dto.setFollowing(FollowUserSummaryDTO.from(follow.getFollowing()));
        dto.setCreatedAt(follow.getCreatedAt());
        dto.setBlocking(follow.isBlocking());
        dto.setFriend(Boolean.TRUE.equals(follow.getFriend()));
        return dto;
    }
}
