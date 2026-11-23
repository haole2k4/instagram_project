package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.follow.FollowResponseDTO;
import com.example.backend_instagram.dto.follow.FollowSummaryDTO;
import com.example.backend_instagram.dto.follow.FollowUserSummaryDTO;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.service.CurrentUserService;
import com.example.backend_instagram.service.FollowService;
import com.example.backend_instagram.service.UserService;
import com.example.backend_instagram.utils.error.ApiException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/follow")
public class FollowController {

  private final FollowService followService;
  private final UserService userService;
  private final CurrentUserService currentUserService;

  public FollowController(
    FollowService followService,
    UserService userService,
    CurrentUserService currentUserService
  ) {
    this.followService = followService;
    this.userService = userService;
    this.currentUserService = currentUserService;
  }

  @GetMapping("/all")
  public ResponseEntity<List<FollowSummaryDTO>> getFollow() {
    return ResponseEntity.ok(this.followService.getAllFollowSummaries());
  }

  @GetMapping("/followers/{userId}")
  public List<FollowSummaryDTO> getFollowers(@PathVariable Long userId) {
    return followService.getFollowerSummariesOfUser(userId);
  }

  @GetMapping("/following/{userId}")
  public List<FollowSummaryDTO> getFollowing(@PathVariable Long userId) {
    return followService.getFollowingSummariesOfUser(userId);
  }

  @GetMapping("/following/users/{userId}")
  public ResponseEntity<List<FollowUserSummaryDTO>> getFollowingUsers(@PathVariable Long userId) {
    return ResponseEntity.ok(followService.getFollowingUserSummaries(userId));
  }

  @PostMapping("/create")
  public ResponseEntity<FollowResponseDTO> followUser(
    @RequestParam(required = false) Long followerId,
    @RequestParam Long followingId
  ) {
    User follower = currentUserService.requireCurrentUser();
    User following = userService.fetchUserById(followingId);
    if (following == null) {
      throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại.");
    }
    return ResponseEntity
      .status(HttpStatus.CREATED)
      .body(followService.createFollow(follower, following));
  }

  @PostMapping("/unfollow")
  public ResponseEntity<Void> unfollowUser(
    @RequestParam(required = false) Long followerId,
    @RequestParam Long followingId
  ) {
    User follower = currentUserService.requireCurrentUser();
    User following = userService.fetchUserById(followingId);
    if (following == null) {
      throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại.");
    }
    followService.unfollow(follower, following);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/following/count/{userId}")
  public ResponseEntity<Long> countFollowing(@PathVariable Long userId) {
    return ResponseEntity.ok(followService.countFollowingOfUser(userId));
  }
}
