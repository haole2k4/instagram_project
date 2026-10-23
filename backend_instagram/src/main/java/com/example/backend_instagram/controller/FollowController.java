package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.follow.FollowResponseDTO;
import com.example.backend_instagram.entity.Follow;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.service.AccountStatusService;
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
  private final AccountStatusService accountStatusService;

  public FollowController(
    FollowService followService,
    UserService userService,
    CurrentUserService currentUserService,
    AccountStatusService accountStatusService
  ) {
    this.followService = followService;
    this.userService = userService;
    this.currentUserService = currentUserService;
    this.accountStatusService = accountStatusService;
  }

  @GetMapping("/all")
  public ResponseEntity<List<Follow>> getFollow() {
    return ResponseEntity.ok(this.followService.getAllPairOfFollow());
  }

  @GetMapping("/followers/{userId}")
  public List<Follow> getFollowers(@PathVariable Long userId) {
    return followService.getFollowersOfUser(userId);
  }

  @GetMapping("/following/{userId}")
  public List<Follow> getFollowing(@PathVariable Long userId) {
    return followService.getFollowingOfUser(userId);
  }

  @GetMapping("/following/users/{userId}")
  public ResponseEntity<List<User>> getFollowingUsers(@PathVariable Long userId) {
    List<Follow> follows = followService.getFollowingOfUser(userId);
    List<User> followingUsers = follows
      .stream()
      .map(Follow::getFollowing)
      .filter(user -> !accountStatusService.isRestricted(user))
      .toList();
    return ResponseEntity.ok(followingUsers);
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
