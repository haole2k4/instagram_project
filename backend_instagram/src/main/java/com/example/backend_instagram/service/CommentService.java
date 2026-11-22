package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.comment.CommentDTO;
import com.example.backend_instagram.entity.Comment;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.CommentRepository;
import com.example.backend_instagram.repository.PostRepository;
import com.example.backend_instagram.utils.SecurityUtils;
import com.example.backend_instagram.utils.constant.CacheNames;
import com.example.backend_instagram.utils.error.ApiException;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommentService {

  private static final int MAX_COMMENT_LENGTH = 255;

  private final CommentRepository commentRepository;
  private final PostRepository postRepository;
  private final PostService postService;
  private final UserService userService;
  private final NotificationService notificationService;
  private final AccountStatusService accountStatusService;
  private final CacheManager cacheManager;

  @Autowired
  public CommentService(
    CommentRepository commentRepository,
    PostRepository postRepository,
    PostService postService,
    UserService userService,
    NotificationService notificationService,
    AccountStatusService accountStatusService,
    ObjectProvider<CacheManager> cacheManagerProvider
  ) {
    this(
      commentRepository,
      postRepository,
      postService,
      userService,
      notificationService,
      accountStatusService,
      cacheManagerProvider.getIfAvailable()
    );
  }

  public CommentService(
    CommentRepository commentRepository,
    PostRepository postRepository,
    PostService postService,
    UserService userService,
    NotificationService notificationService,
    AccountStatusService accountStatusService,
    CacheManager cacheManager
  ) {
    this.commentRepository = commentRepository;
    this.postRepository = postRepository;
    this.postService = postService;
    this.userService = userService;
    this.notificationService = notificationService;
    this.accountStatusService = accountStatusService;
    this.cacheManager = cacheManager;
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
    String trimmed = content.trim();
    if (trimmed.length() > MAX_COMMENT_LENGTH) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "VALIDATION_ERROR",
        "Bình luận tối đa 255 ký tự."
      );
    }
    User user = userService.fetchUserById(userId);
    if (user == null) {
      throw new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại.");
    }
    accountStatusService.requireWritable(user);
    Post post = postService.getVisiblePost(postId, userId);

    Comment comment = new Comment();
    comment.setContent(trimmed);
    comment.setUser(user);
    comment.setPost(post);
    commentRepository.save(comment);

    post.setCommentsCount(commentRepository.countPublicByPost(post));
    postRepository.save(post);

    notificationService.createCommentNotification(postId, userId, trimmed);
  }

  public List<CommentDTO> getCommentsByPostId(Long postId) {
    return getCommentsByPostId(postId, SecurityUtils.getCurrentUserId().orElse(null));
  }

  @SuppressWarnings("unchecked")
  public List<CommentDTO> getCommentsByPostId(Long postId, Long viewerId) {
    Post post = postService.getVisiblePost(postId, viewerId);

    Cache cache = cacheManager == null ? null : cacheManager.getCache(CacheNames.COMMENTS);
    if (cache != null) {
      List<CommentDTO> cached = cache.get(postId, List.class);
      if (cached != null) {
        return cached;
      }
    }

    List<CommentDTO> comments = commentRepository
      .findPublicByPostOrderByCreatedAtDesc(post)
      .stream()
      .map(this::toDTO)
      .toList();
    Long count = commentRepository.countPublicByPost(post);
    comments.forEach(comment -> comment.setCommentsCount(count));

    if (cache != null) {
      cache.put(postId, comments);
    }
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
