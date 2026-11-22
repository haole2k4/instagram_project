package com.example.backend_instagram.service;

import com.example.backend_instagram.entity.Like;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.LikeRepository;
import com.example.backend_instagram.utils.error.ApiException;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LikeService {

  private final LikeRepository likeRepository;
  private final PostService postService;
  private final UserService userService;
  private final NotificationService notificationService;
  private final AccountStatusService accountStatusService;

  public LikeService(
    LikeRepository likeRepository,
    PostService postService,
    UserService userService,
    NotificationService notificationService,
    AccountStatusService accountStatusService
  ) {
    this.likeRepository = likeRepository;
    this.postService = postService;
    this.userService = userService;
    this.notificationService = notificationService;
    this.accountStatusService = accountStatusService;
  }

  @Transactional
  public void likePost(Long postId, Long userId) {
    User user = requireUser(userId);
    accountStatusService.requireWritable(user);
    Post post = postService.getVisiblePost(postId, userId);

    if (likeRepository.findByPostAndUser(post, user).isPresent()) {
      throw new ApiException(HttpStatus.CONFLICT, "ALREADY_LIKED", "Người dùng đã thích bài viết này");
    }

    Like like = new Like();
    like.setPost(post);
    like.setUser(user);
    try {
      likeRepository.saveAndFlush(like);
    } catch (DataIntegrityViolationException ex) {
      throw new ApiException(HttpStatus.CONFLICT, "ALREADY_LIKED", "Người dùng đã thích bài viết này");
    }

    int currentLikes = post.getLikesCount() == null ? 0 : post.getLikesCount();
    post.setLikesCount(currentLikes + 1);
    postService.savePost(post);

    notificationService.createLikeNotification(postId, userId);
  }

  @Transactional
  public void unlikePost(Long postId, Long userId) {
    User user = requireUser(userId);
    accountStatusService.requireWritable(user);
    Post post = postService.getVisiblePost(postId, userId);

    Like like = likeRepository
      .findByPostAndUser(post, user)
      .orElseThrow(() ->
        new ApiException(HttpStatus.CONFLICT, "NOT_LIKED", "Người dùng chưa thích bài viết này")
      );

    likeRepository.delete(like);
    int currentLikes = post.getLikesCount() == null ? 0 : post.getLikesCount();
    post.setLikesCount(Math.max(0, currentLikes - 1));
    postService.savePost(post);
  }

  public List<Long> getLikedPostIdsByUser(Long userId) {
    User user = requireUser(userId);
    return likeRepository.findByUser(user).stream().map(like -> like.getPost().getId()).toList();
  }

  private User requireUser(Long userId) {
    User user = userService.fetchUserById(userId);
    if (user == null) {
      throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại.");
    }
    return user;
  }
}
