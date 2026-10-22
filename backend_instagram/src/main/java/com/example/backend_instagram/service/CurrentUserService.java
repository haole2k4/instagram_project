package com.example.backend_instagram.service;

import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.utils.SecurityUntil;
import com.example.backend_instagram.utils.error.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {
  private final UserRepository userRepository;

  public CurrentUserService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public User requireCurrentUser() {
    Long id = SecurityUntil.getCurrentUserId().orElse(null);
    if (id != null) {
      return userRepository
        .findById(id)
        .orElseThrow(() ->
          new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHENTICATED", "User not found")
        );
    }
    String email = SecurityUntil.getCurrentUserLogin().orElse(null);
    if (email == null || email.isBlank()) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        "UNAUTHENTICATED",
        "Authentication required"
      );
    }
    User user = userRepository.findByUserEmail(email);
    if (user == null) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        "UNAUTHENTICATED",
        "User not found"
      );
    }
    return user;
  }

  public Long currentUserIdOrNull() {
    Long id = SecurityUntil.getCurrentUserId().orElse(null);
    if (id != null) {
      return id;
    }
    String email = SecurityUntil.getCurrentUserLogin().orElse(null);
    if (email == null || email.isBlank()) {
      return null;
    }
    User user = userRepository.findByUserEmail(email);
    return user == null ? null : user.getId();
  }
}
