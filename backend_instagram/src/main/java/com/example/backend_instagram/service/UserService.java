package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.user.ResCreateUserDTO;
import com.example.backend_instagram.dto.user.RestUpdateUser;
import com.example.backend_instagram.dto.user.UserStatsDTO;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.PostRepository;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.utils.constant.CacheNames;
import com.example.backend_instagram.utils.error.ApiException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class UserService {

  private final UserRepository userRepository;
  private final PostRepository postRepository;
  private final FollowService followService;
  private final AccountStatusService accountStatusService;

  @Autowired
  public UserService(
    UserRepository userRepository,
    PostRepository postRepository,
    FollowService followService,
    AccountStatusService accountStatusService
  ) {
    this.userRepository = userRepository;
    this.postRepository = postRepository;
    this.followService = followService;
    this.accountStatusService = accountStatusService;
  }

  @CacheEvict(cacheNames = CacheNames.USER_STATS, allEntries = true)
  public User createUser(User user) {
    return this.userRepository.save(user);
  }

  public User handleGetUserByUserNawm(String username) {
    return this.userRepository.findByUserEmail(username);
  }

  public List<User> getAllUser() {
    return this.userRepository
      .findAll()
      .stream()
      .filter(user -> !accountStatusService.isRestricted(user))
      .toList();
  }

  public boolean isNikNameExsit(String nikname) {
    return this.userRepository.existsByUserNickname(nikname);
  }

  public void updateUserToken(String refreshToken, String username) {
    User user = handleGetUserByUserNawm(username);
    if (user != null) {
      user.setRefreshToken(refreshToken);
      userRepository.save(user);
    }
  }

  public void updateUser(User user) {
    userRepository.save(user);
  }

  public User fetchUserById(Long id) {
    Optional<User> userOptional = this.userRepository.findById(id);
    return userOptional.orElse(null);
  }

  @Caching(
    evict = {
      @CacheEvict(
        cacheNames = CacheNames.USER_STATS,
        key = "#user.id",
        condition = "#user != null && #user.id != null"
      ),
      @CacheEvict(cacheNames = CacheNames.POSTS, allEntries = true),
      @CacheEvict(cacheNames = CacheNames.COMMENTS, allEntries = true),
    }
  )
  public User handleUpdateUser(User user) {
    User existing = this.fetchUserById(user.getId());
    if (existing == null) {
      return null;
    }

    if (user.getUserNickname() != null && !user.getUserNickname().isBlank()) {
      String newNickname = user.getUserNickname().trim();
      if (
        !newNickname.equals(existing.getUserNickname()) &&
        this.isNikNameExsit(newNickname)
      ) {
        throw new ApiException(
          HttpStatus.CONFLICT,
          "NICKNAME_EXISTS",
          "Nickname đã tồn tại. Vui lòng chọn nickname khác!"
        );
      }
      existing.setUserNickname(newNickname);
    }

    if (user.getUserFullname() != null && !user.getUserFullname().isBlank()) {
      existing.setUserFullname(user.getUserFullname().trim());
    }
    if (user.getUserBio() != null) {
      existing.setUserBio(user.getUserBio());
    }
    if (user.getUserPhone() != null) {
      existing.setUserPhone(user.getUserPhone());
    }
    if (user.getUserImage() != null && !user.getUserImage().isBlank()) {
      existing.setUserImage(user.getUserImage());
    }
    if (user.getUserGender() != null && !user.getUserGender().isBlank()) {
      existing.setUserGender(user.getUserGender());
    }
    if (user.getUserBday() != null && !user.getUserBday().isBlank()) {
      existing.setUserBday(user.getUserBday());
    }
    existing.setUpdatedAt(Instant.now());
    return this.userRepository.save(existing);
  }

  public ResCreateUserDTO convertToResCreateUserDTO(User user) {
    ResCreateUserDTO resCreateUserDTO = new ResCreateUserDTO();
    resCreateUserDTO.setId(user.getId());
    resCreateUserDTO.setName(user.getUserFullname());
    resCreateUserDTO.setUserNikName(user.getUserNickname());
    resCreateUserDTO.setEmail(user.getUserEmail());
    resCreateUserDTO.setUserBio(user.getUserBio());
    resCreateUserDTO.setUserBday(user.getUserBday());
    if (user.getCreatedAt() != null) {
      resCreateUserDTO.setCreatedAt(user.getCreatedAt().toInstant(ZoneOffset.UTC));
    }
    resCreateUserDTO.setGender(user.getUserGender());
    return resCreateUserDTO;
  }

  public RestUpdateUser convertToResUpdateUpdateUserDTO(User user) {
    RestUpdateUser restUpdateUser = new RestUpdateUser();
    restUpdateUser.setId(user.getId());
    restUpdateUser.setName(user.getUserFullname());
    restUpdateUser.setEmail(user.getUserEmail());
    restUpdateUser.setUserBday(user.getUserBday());
    restUpdateUser.setUserGender(user.getUserGender());
    restUpdateUser.setUserImage(user.getUserImage());
    restUpdateUser.setUserNikName(user.getUserNickname());
    restUpdateUser.setUserPhone(user.getUserPhone());
    restUpdateUser.setUserBio(user.getUserBio());
    restUpdateUser.setUpdatedAt(user.getUpdatedAt());
    return restUpdateUser;
  }

  public User getUserByRefreshTokenAndUserEmail(String token, String email) {
    return this.userRepository.findByRefreshTokenAndUserEmail(token, email);
  }

  @Cacheable(cacheNames = CacheNames.USER_STATS, key = "#userId")
  public UserStatsDTO getUserStats(Long userId) {
    User user = fetchUserById(userId);
    if (user == null) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        "USER_NOT_FOUND",
        "Người dùng không tồn tại."
      );
    }
    Long followersCount = followService.countFollowersOfUser(userId);
    Long followingCount = followService.countFollowingOfUser(userId);
    Long postsCount = postRepository.countByUserId(userId);

    return UserStatsDTO.from(user, followersCount, followingCount, postsCount);
  }

  public User getUserById(Long userId) {
    return this.userRepository.findById(userId).orElse(null);
  }
}
