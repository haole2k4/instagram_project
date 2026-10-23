package com.example.backend_instagram.service;

import com.example.backend_instagram.entity.Follow;
import com.example.backend_instagram.entity.Story;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.FollowRepository;
import com.example.backend_instagram.repository.StoryRepository;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.utils.AwsS3Service;
import com.example.backend_instagram.utils.error.ApiException;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StoryService {
  private final StoryRepository storyRepository;
  private final UserRepository userRepository;
  private final AwsS3Service awsS3Service;
  private final FollowRepository followRepository;
  private final AccountStatusService accountStatusService;

  public StoryService(
    StoryRepository storyRepository,
    UserRepository userRepository,
    AwsS3Service awsS3Service,
    FollowRepository followRepository,
    AccountStatusService accountStatusService
  ) {
    this.storyRepository = storyRepository;
    this.userRepository = userRepository;
    this.awsS3Service = awsS3Service;
    this.followRepository = followRepository;
    this.accountStatusService = accountStatusService;
  }

  @Transactional
  public Story createStory(Long userId, MultipartFile file, String access, Integer status) {
    User user = userRepository
      .findById(userId)
      .orElseThrow(() ->
        new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại.")
      );
    accountStatusService.requireWritable(user);

    try {
      String originalFilename = file.getOriginalFilename();
      String extension = originalFilename == null || !originalFilename.contains(".")
        ? ""
        : originalFilename.substring(originalFilename.lastIndexOf("."));
      String fileName = System.currentTimeMillis() + "_story" + extension;
      String url = awsS3Service.uploadFile(fileName, file.getBytes());

      Story story = new Story();
      story.setUser(user);
      story.setUrl(url);
      story.setAccess(access);
      story.setStatus(status == null ? 1 : status);
      return storyRepository.save(story);
    } catch (IOException e) {
      throw new IllegalStateException("Không thể tải story: " + e.getMessage());
    }
  }

  public List<Story> getStoriesByUserId(Long userId) {
    return storyRepository.findPublicByUserId(userId);
  }

  public List<Story> getAllStories() {
    return storyRepository.findAllPublic();
  }

  @Transactional
  public void deleteStory(Long storyId, Long actorId) {
    Story story = storyRepository
      .findById(storyId)
      .orElseThrow(() ->
        new ApiException(HttpStatus.NOT_FOUND, "TARGET_NOT_FOUND", "Story không tồn tại.")
      );
    if (!story.getUser().getId().equals(actorId)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "FORBIDDEN",
        "Bạn không có quyền xóa story này."
      );
    }
    accountStatusService.requireWritable(story.getUser());
    story.setStatus(0);
    storyRepository.save(story);
  }

  public List<Story> getStoriesFromFollowing(Long userId) {
    List<Follow> following = followRepository.findByFollowerId(userId);
    List<Long> followingIds = following
      .stream()
      .map(follow -> follow.getFollowing().getId())
      .toList();
    if (followingIds.isEmpty()) {
      return List.of();
    }
    return storyRepository.findPublicFollowing(followingIds, LocalDateTime.now().minusHours(24));
  }
}
