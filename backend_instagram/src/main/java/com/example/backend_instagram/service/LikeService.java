package com.example.backend_instagram.service;

import com.example.backend_instagram.entity.Like;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.LikeRepository;
import com.example.backend_instagram.utils.error.ApiException;
import java.util.List;
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
    Post post = postService.getVisiblePost(postId);
    User user = requireUser(userId);
    accountStatusService.requireWritable(user);

    if (likeRepository.findByPostAndUser(post, user).isPresent()) {
      throw new IllegalStateException("Người dùng đã thích bài viết này");
    }

    Like like = new Like();
    like.setPost(post);
    like.setUser(user);
    likeRepository.save(like);

    post.setLikesCount(post.getLikesCount() + 1);
    postService.savePost(post);

    notificationService.createLikeNotification(postId, userId);
  }

  @Transactional
  public void unlikePost(Long postId, Long userId) {
    Post post = postService.getVisiblePost(postId);
    User user = requireUser(userId);
    accountStatusService.requireWritable(user);

    Like like = likeRepository
      .findByPostAndUser(post, user)
      .orElseThrow(() -> new IllegalStateException("Người dùng chưa thích bài viết này"));

    likeRepository.delete(like);
    post.setLikesCount(Math.max(0, post.getLikesCount() - 1));
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
