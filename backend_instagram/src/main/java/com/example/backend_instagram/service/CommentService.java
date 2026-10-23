package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.comment.CommentDTO;
import com.example.backend_instagram.entity.Comment;
import com.example.backend_instagram.entity.ModerationState;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.CommentRepository;
import com.example.backend_instagram.repository.PostRepository;
import com.example.backend_instagram.utils.constant.CacheNames;
import com.example.backend_instagram.utils.error.ApiException;
import java.util.List;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommentService {

  private final CommentRepository commentRepository;
  private final PostRepository postRepository;
  private final UserService userService;
  private final NotificationService notificationService;
  private final AccountStatusService accountStatusService;

  public CommentService(
    CommentRepository commentRepository,
    PostRepository postRepository,
    UserService userService,
    NotificationService notificationService,
    AccountStatusService accountStatusService
  ) {
    this.commentRepository = commentRepository;
    this.postRepository = postRepository;
    this.userService = userService;
    this.notificationService = notificationService;
    this.accountStatusService = accountStatusService;
  }

  @Transactional
  @Caching(
    evict = {
      @CacheEvict(cacheNames = CacheNames.COMMENTS, allEntries = true),
      @CacheEvict(cacheNames = CacheNames.POSTS, allEntries = true),
    }
  )
  public void addComment(Long postId, Long userId, String content) {
    if (content == null || content.isBlank()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Bình luận không được để trống.");
    }
    if (content.length() > 1000) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "VALIDATION_ERROR",
        "Bình luận tối đa 1000 ký tự."
      );
    }
    Post post = postRepository
      .findById(postId)
      .orElseThrow(() ->
        new ApiException(HttpStatus.NOT_FOUND, "TARGET_NOT_FOUND", "Bài viết không tồn tại.")
      );
    User user = userService.fetchUserById(userId);
    if (user == null) {
      throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại.");
    }
    accountStatusService.requireWritable(user);
    if (!"True".equals(post.getStatus()) ||
        post.getModerationState() != ModerationState.VISIBLE ||
        accountStatusService.isRestricted(post.getUser())) {
      throw new ApiException(HttpStatus.NOT_FOUND, "TARGET_NOT_FOUND", "Bài viết không tồn tại.");
    }

    Comment comment = new Comment();
    comment.setContent(content.trim());
    comment.setUser(user);
    comment.setPost(post);
    commentRepository.save(comment);

    post.setCommentsCount(commentRepository.countPublicByPost(post));
    postRepository.save(post);

    notificationService.createCommentNotification(postId, userId, content);
  }

  @Cacheable(cacheNames = CacheNames.COMMENTS, key = "#postId")
  public List<CommentDTO> getCommentsByPostId(Long postId) {
    Post post = postRepository
      .findById(postId)
      .orElseThrow(() ->
        new ApiException(HttpStatus.NOT_FOUND, "TARGET_NOT_FOUND", "Bài viết không tồn tại.")
      );
    if (!"True".equals(post.getStatus()) ||
        post.getModerationState() != ModerationState.VISIBLE ||
        accountStatusService.isRestricted(post.getUser())) {
      throw new ApiException(HttpStatus.NOT_FOUND, "TARGET_NOT_FOUND", "Bài viết không tồn tại.");
    }
    List<CommentDTO> comments = commentRepository
      .findPublicByPostOrderByCreatedAtDesc(post)
      .stream()
      .map(this::toDTO)
      .toList();
    Long count = commentRepository.countPublicByPost(post);
    comments.forEach(comment -> comment.setCommentsCount(count));
    return comments;
  }

  private CommentDTO toDTO(Comment comment) {
    CommentDTO dto = new CommentDTO();
    dto.setId(comment.getId());
    dto.setUserId(comment.getUser().getId());
    dto.setUserNickname(comment.getUser().getUserNickname());
    dto.setUserImage(comment.getUser().getUserImage());
    dto.setPostId(comment.getPost().getId());
    dto.setContent(comment.getContent());
    dto.setCreatedAt(comment.getCreatedAt());
    dto.setMessage(
      comment.getUser().getUserNickname() + " commented: " + truncateComment(comment.getContent(), 50)
    );
    return dto;
  }

  private String truncateComment(String comment, int maxLength) {
    if (comment == null || comment.length() <= maxLength) {
      return comment;
    }
    return comment.substring(0, maxLength - 3) + "...";
  }
}
