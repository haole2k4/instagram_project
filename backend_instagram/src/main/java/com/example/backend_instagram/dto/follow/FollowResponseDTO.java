package com.example.backend_instagram.dto.follow;

import com.example.backend_instagram.entity.Follow;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FollowResponseDTO {
    private FollowSummaryDTO follow;

    public FollowResponseDTO(Follow follow) {
        this.follow = FollowSummaryDTO.from(follow);
    }

    public FollowResponseDTO(FollowSummaryDTO follow) {
        this.follow = follow;
    }
}
