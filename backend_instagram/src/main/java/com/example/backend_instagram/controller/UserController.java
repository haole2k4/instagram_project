package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.user.RestUpdateUser;
import com.example.backend_instagram.dto.user.UserStatsDTO;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.service.AccountStatusService;
import com.example.backend_instagram.service.UserService;
import com.example.backend_instagram.utils.AwsS3Service;
import com.example.backend_instagram.utils.SecurityUntil;
import com.example.backend_instagram.utils.error.ApiException;
import com.example.backend_instagram.utils.error.IdInvalidException;
import jakarta.validation.Valid;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class UserController {
  private final UserService userService;
  private final AwsS3Service awsS3Service;
  private final AccountStatusService accountStatusService;

  public UserController(
    UserService userService,
    AwsS3Service awsS3Service,
    AccountStatusService accountStatusService
  ) {
    this.userService = userService;
    this.awsS3Service = awsS3Service;
    this.accountStatusService = accountStatusService;
  }

  @GetMapping("/user/all")
  public ResponseEntity<List<User>> getUser() {
    return ResponseEntity.ok(this.userService.getAllUser());
  }

  @PutMapping("/user")
  public ResponseEntity<RestUpdateUser> updateUser(
    @Valid @RequestBody User postUser
  ) throws IdInvalidException {
    Long currentId = SecurityUntil
      .getCurrentUserId()
      .orElseThrow(() ->
        new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "Authentication required")
      );
    postUser.setId(currentId);

    if (postUser.getUserImage() != null && !postUser.getUserImage().isEmpty()) {
      String base64Image = postUser.getUserImage();
      if (base64Image.contains(",")) {
        base64Image = base64Image.split(",")[1];
      }
      try {
        byte[] imageBytes = Base64.getDecoder().decode(base64Image);
        String fileName = "avatars/" + UUID.randomUUID() + ".png";
        postUser.setUserImage(awsS3Service.uploadFile(fileName, imageBytes));
      } catch (IllegalArgumentException e) {
        throw new IdInvalidException("Ảnh đại diện không hợp lệ");
      }
    }

    User user = this.userService.handleUpdateUser(postUser);
    if (user == null) {
      throw new IdInvalidException("Người dùng không tồn tại");
    }
    return ResponseEntity.ok(this.userService.convertToResUpdateUpdateUserDTO(user));
  }

  @GetMapping("/stats/{userId}")
  public ResponseEntity<UserStatsDTO> getUserStats(@PathVariable Long userId) {
    return ResponseEntity.ok(userService.getUserStats(userId));
  }

  @GetMapping("/user/{userId}")
  public ResponseEntity<User> getUserById(@PathVariable Long userId) {
    User user = userService.getUserById(userId);
    if (user == null) {
      throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại.");
    }
    Long currentId = SecurityUntil.getCurrentUserId().orElse(null);
    boolean staff = SecurityUntil.hasRole("ADMIN") || SecurityUntil.hasRole("MODERATOR");
    if (
      accountStatusService.isRestricted(user) &&
      !staff &&
      (currentId == null || !currentId.equals(userId))
    ) {
      throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại.");
    }
    return ResponseEntity.ok(user);
  }
}
