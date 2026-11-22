package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.follow.FollowResponseDTO;
import com.example.backend_instagram.dto.follow.FollowSummaryDTO;
import com.example.backend_instagram.dto.follow.FollowUserSummaryDTO;
import com.example.backend_instagram.entity.Follow;
import com.example.backend_instagram.entity.FollowId;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.FollowRepository;
import com.example.backend_instagram.utils.constant.CacheNames;
import com.example.backend_instagram.utils.error.ApiException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FollowService {
    @Autowired
    private FollowRepository followRepository;

    @Autowired
    private AccountStatusService accountStatusService;

    @Transactional(readOnly = true)
    public List<FollowSummaryDTO> getAllFollowSummaries() {
        return followRepository.findAll().stream()
                .map(FollowSummaryDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FollowSummaryDTO> getFollowerSummariesOfUser(Long userId) {
        return followRepository.findByFollowingId(userId).stream()
                .map(FollowSummaryDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FollowSummaryDTO> getFollowingSummariesOfUser(Long userId) {
        return followRepository.findByFollowerId(userId).stream()
                .map(FollowSummaryDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FollowUserSummaryDTO> getFollowingUserSummaries(Long userId) {
        return followRepository.findByFollowerId(userId).stream()
                .map(Follow::getFollowing)
                .filter(user -> !accountStatusService.isRestricted(user))
                .map(FollowUserSummaryDTO::from)
                .toList();
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = CacheNames.POSTS, allEntries = true),
            @CacheEvict(cacheNames = CacheNames.USER_STATS, allEntries = true)
    })
    public FollowResponseDTO createFollow(User currUser, User followedUser) {
        if (currUser == null || followedUser == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại.");
        }
        if (currUser.getId().equals(followedUser.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Không thể tự theo dõi mình.");
        }
        accountStatusService.requireWritable(currUser);
        if (accountStatusService.isRestricted(followedUser)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại.");
        }

        Optional<Follow> existing = followRepository.findByFollowerAndFollowing(currUser, followedUser);
        if (existing.isPresent()) {
            return new FollowResponseDTO(existing.get());
        }

        Follow follow = new Follow();
        follow.setId(new FollowId(currUser.getId(), followedUser.getId()));
        follow.setFollower(currUser);
        follow.setFollowing(followedUser);
        follow.setCreatedAt(LocalDateTime.now());
        follow.setBlocking(false);
        follow.setFriend(false);

        Optional<Follow> reverseFollow = followRepository.findByFollowerAndFollowing(followedUser, currUser);
        if (reverseFollow.isPresent()) {
            Follow reverse = reverseFollow.get();
            reverse.setFriend(true);
            follow.setFriend(true);
            followRepository.save(reverse);
        }

        Follow savedFollow = followRepository.save(follow);
        return new FollowResponseDTO(savedFollow);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(cacheNames = CacheNames.POSTS, allEntries = true),
            @CacheEvict(cacheNames = CacheNames.USER_STATS, allEntries = true)
    })
    public void unfollow(User currUser, User followedUser) {
        if (currUser == null || followedUser == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại.");
        }
        accountStatusService.requireWritable(currUser);
        Follow follow = followRepository.findByFollowerAndFollowing(currUser, followedUser)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.NOT_FOUND,
                        "FOLLOW_NOT_FOUND",
                        "Quan hệ theo dõi không tồn tại."));

        Optional<Follow> reverseFollowOpt = followRepository.findByFollowerAndFollowing(followedUser, currUser);
        reverseFollowOpt.ifPresent(reverseFollow -> {
            reverseFollow.setFriend(false);
            followRepository.save(reverseFollow);
        });

        followRepository.delete(follow);
    }

    public Long countFollowersOfUser(Long userId) {
        return followRepository.countByFollowingId(userId);
    }

    public Long countFollowingOfUser(Long userId) {
        return followRepository.countByFollowerId(userId);
    }
}
