package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.entity.Comment;
import com.example.backend_instagram.entity.ContentAction;
import com.example.backend_instagram.entity.Media;
import com.example.backend_instagram.entity.ModerationState;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.ReportTargetType;
import com.example.backend_instagram.entity.RoleCode;
import com.example.backend_instagram.entity.Story;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.CommentRepository;
import com.example.backend_instagram.repository.PostRepository;
import com.example.backend_instagram.repository.ReportRepository;
import com.example.backend_instagram.repository.StoryRepository;
import com.example.backend_instagram.utils.constant.CacheNames;
import com.example.backend_instagram.utils.error.ApiException;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class AdminContentService {
  private static final int MAX_MODERATION_REASON_LENGTH = 500;
  private static final int MAX_AUDIT_REASON_LENGTH = 1000;

  private final PostRepository postRepository;
  private final CommentRepository commentRepository;
  private final StoryRepository storyRepository;
  private final ReportRepository reportRepository;
  private final CurrentUserService currentUserService;
  private final AuditService auditService;
  private final NotificationService notificationService;
  private final CacheManager cacheManager;

  @Autowired
  public AdminContentService(
    PostRepository postRepository,
    CommentRepository commentRepository,
    StoryRepository storyRepository,
    ReportRepository reportRepository,
    CurrentUserService currentUserService,
    AuditService auditService,
    NotificationService notificationService,
    ObjectProvider<CacheManager> cacheManagerProvider
  ) {
    this(
      postRepository,
      commentRepository,
      storyRepository,
      reportRepository,
      currentUserService,
      auditService,
      notificationService,
      cacheManagerProvider.getIfAvailable()
    );
  }

  public AdminContentService(
    PostRepository postRepository,
    CommentRepository commentRepository,
    StoryRepository storyRepository,
    ReportRepository reportRepository,
    CurrentUserService currentUserService,
    AuditService auditService,
    NotificationService notificationService,
    CacheManager cacheManager
  ) {
    this.postRepository = postRepository;
    this.commentRepository = commentRepository;
    this.storyRepository = storyRepository;
    this.reportRepository = reportRepository;
    this.currentUserService = currentUserService;
    this.auditService = auditService;
    this.notificationService = notificationService;
    this.cacheManager = cacheManager;
  }

  @Transactional(readOnly = true)
  public Page<AdminDtos.ContentItem> list(
    String type,
    String q,
    String state,
    int page,
    int size
  ) {
    String normalizedType = type == null || type.isBlank() ? "POST" : type.toUpperCase();
    PageRequest pageable = PageRequest.of(
      Math.max(page, 0),
      Math.min(Math.max(size, 1), 100),
      Sort.by(Sort.Direction.DESC, "createdAt")
    );
    return switch (normalizedType) {
      case "POST" -> postRepository
        .findAll(postSpec(q, state), pageable)
        .map(this::postItem);
      case "COMMENT" -> commentRepository
        .findAll(commentSpec(q, state), pageable)
        .map(this::commentItem);
      case "STORY" -> storyRepository
        .findAll(storySpec(q, state), pageable)
        .map(this::storyItem);
      default -> throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "INVALID_TARGET_TYPE",
        "Loại nội dung không hợp lệ."
      );
    };
  }

  @Transactional(readOnly = true)
  public AdminDtos.ContentDetail get(String type, Long id) {
    String normalizedType = type == null ? "" : type.toUpperCase();
    return switch (normalizedType) {
      case "POST" -> {
        Post post = findPost(id);
        List<Media> media = post.getMedia();
        Media first = media == null || media.isEmpty() ? null : media.get(0);
        yield new AdminDtos.ContentDetail(
          postItem(post),
          first == null ? null : first.getUrl(),
          first == null ? null : first.getType(),
          null
        );
      }
      case "COMMENT" -> {
        Comment comment = findComment(id);
        yield new AdminDtos.ContentDetail(
          commentItem(comment),
          null,
          null,
          comment.getPost().getId()
        );
      }
      case "STORY" -> {
        Story story = findStory(id);
        yield new AdminDtos.ContentDetail(
          storyItem(story),
          story.getUrl(),
          "IMAGE",
          null
        );
      }
      default -> throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "INVALID_TARGET_TYPE",
        "Loại nội dung không hợp lệ."
      );
    };
  }

  @Transactional
  public AdminDtos.ContentItem moderate(
    String type,
    Long id,
    AdminDtos.ModerateRequest request
  ) {
    User actor = currentUserService.requireCurrentUser();
    if (request.action() == ContentAction.RESTORE && !actor.hasRole(RoleCode.ADMIN)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "FORBIDDEN",
        "Chỉ admin được khôi phục nội dung."
      );
    }
    String normalizedType = type == null ? "" : type.toUpperCase();
    return switch (normalizedType) {
      case "POST" -> moderatePost(id, request, actor);
      case "COMMENT" -> moderateComment(id, request, actor);
      case "STORY" -> moderateStory(id, request, actor);
      default -> throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "INVALID_TARGET_TYPE",
        "Loại nội dung không hợp lệ."
      );
    };
  }

  private AdminDtos.ContentItem moderatePost(
    Long id,
    AdminDtos.ModerateRequest request,
    User actor
  ) {
    Post post = findPost(id);
    assertNotSelf(actor, post.getUser());
    assertStateChange(post.getModerationState(), request.action(), "Bài viết");
    post.setModerationState(toState(request.action()));
    applyReason(post, request, actor);
    postRepository.save(post);
    evictContentCachesAfterCommit();
    audit(actor, request, "POST", id, post.getUser());
    notify(post.getUser(), actor, request, "bài viết");
    return postItem(post);
  }

  private AdminDtos.ContentItem moderateComment(
    Long id,
    AdminDtos.ModerateRequest request,
    User actor
  ) {
    Comment comment = findComment(id);
    assertNotSelf(actor, comment.getUser());
    assertStateChange(comment.getModerationState(), request.action(), "Bình luận");
    comment.setModerationState(toState(request.action()));
    comment.setModerationReasonCode(request.reasonCode());
    comment.setModerationReason(trimMax(request.note(), MAX_MODERATION_REASON_LENGTH));
    comment.setModeratedAt(LocalDateTime.now());
    comment.setModeratedBy(actor.getId());
    commentRepository.save(comment);

    Post post = comment.getPost();
    post.setCommentsCount(commentRepository.countPublicByPost(post));
    postRepository.save(post);

    evictContentCachesAfterCommit();
    audit(actor, request, "COMMENT", id, comment.getUser());
    notify(comment.getUser(), actor, request, "bình luận");
    return commentItem(comment);
  }

  private AdminDtos.ContentItem moderateStory(
    Long id,
    AdminDtos.ModerateRequest request,
    User actor
  ) {
    Story story = findStory(id);
    assertNotSelf(actor, story.getUser());
    assertStateChange(story.getModerationState(), request.action(), "Story");
    story.setModerationState(toState(request.action()));
    story.setModerationReasonCode(request.reasonCode());
    story.setModerationReason(trimMax(request.note(), MAX_MODERATION_REASON_LENGTH));
    story.setModeratedAt(LocalDateTime.now());
    story.setModeratedBy(actor.getId());
    storyRepository.save(story);
    evictContentCachesAfterCommit();
    audit(actor, request, "STORY", id, story.getUser());
    notify(story.getUser(), actor, request, "story");
    return storyItem(story);
  }

  private void applyReason(
    Post post,
    AdminDtos.ModerateRequest request,
    User actor
  ) {
    post.setModerationReasonCode(request.reasonCode());
    post.setModerationReason(trimMax(request.note(), MAX_MODERATION_REASON_LENGTH));
    post.setModeratedAt(LocalDateTime.now());
    post.setModeratedBy(actor.getId());
  }

  private void audit(
    User actor,
    AdminDtos.ModerateRequest request,
    String type,
    Long id,
    User author
  ) {
    auditService.log(
      actor,
      request.action() == ContentAction.HIDE ? "CONTENT_HIDE" : "CONTENT_RESTORE",
      type,
      id,
      null,
      request.reasonCode().name(),
      trimMax(request.note(), MAX_AUDIT_REASON_LENGTH),
      java.util.Map.of("authorId", author.getId())
    );
  }

  private void notify(
    User author,
    User actor,
    AdminDtos.ModerateRequest request,
    String label
  ) {
    try {
      String action = request.action() == ContentAction.HIDE ? "ẩn" : "khôi phục";
      notificationService.createModerationNotification(
        author,
        actor,
        "Quản trị viên đã " + action + " " + label + " của bạn."
      );
    } catch (Exception ignored) {
      // Notification best-effort.
    }
  }

  private void assertNotSelf(User actor, User author) {
    if (author != null && author.getId().equals(actor.getId())) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "FORBIDDEN",
        "Không thể kiểm duyệt nội dung của chính mình."
      );
    }
  }

  private void assertStateChange(ModerationState current, ContentAction action, String label) {
    ModerationState target = toState(action);
    if (current == target) {
      throw new ApiException(
        HttpStatus.CONFLICT,
        "INVALID_ACTION",
        label + " đã ở trạng thái này."
      );
    }
  }

  private ModerationState toState(ContentAction action) {
    return action == ContentAction.HIDE ? ModerationState.HIDDEN : ModerationState.VISIBLE;
  }

  private void evictContentCachesAfterCommit() {
    Runnable evictAll = () -> {
      clearCache(CacheNames.POSTS);
      clearCache(CacheNames.COMMENTS);
      clearCache(CacheNames.USER_STATS);
    };
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            evictAll.run();
          }
        }
      );
    } else {
      evictAll.run();
    }
  }

  private void clearCache(String cacheName) {
    if (cacheManager == null) {
      return;
    }
    Cache cache = cacheManager.getCache(cacheName);
    if (cache != null) {
      cache.clear();
    }
  }

  private Specification<Post> postSpec(String q, String state) {
    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      if (q != null && !q.isBlank()) {
        predicates.add(cb.like(cb.lower(root.get("title")), "%" + q.trim().toLowerCase() + "%"));
      }
      if (state != null && !state.isBlank() && !"ALL".equalsIgnoreCase(state)) {
        predicates.add(cb.equal(root.get("moderationState"), ModerationState.valueOf(state.toUpperCase())));
      }
      return cb.and(predicates.toArray(new Predicate[0]));
    };
  }

  private Specification<Comment> commentSpec(String q, String state) {
    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      if (q != null && !q.isBlank()) {
        predicates.add(cb.like(cb.lower(root.get("content")), "%" + q.trim().toLowerCase() + "%"));
      }
      if (state != null && !state.isBlank() && !"ALL".equalsIgnoreCase(state)) {
        predicates.add(cb.equal(root.get("moderationState"), ModerationState.valueOf(state.toUpperCase())));
      }
      Join<Comment, User> user = root.join("user");
      predicates.add(cb.isNotNull(user.get("id")));
      return cb.and(predicates.toArray(new Predicate[0]));
    };
  }

  private Specification<Story> storySpec(String q, String state) {
    return (root, query, cb) -> {
      List<Predicate> predicates = new ArrayList<>();
      if (q != null && !q.isBlank()) {
        String trimmed = q.trim();
        String like = "%" + trimmed.toLowerCase() + "%";
        Join<Story, User> user = root.join("user");
        List<Predicate> qPredicates = new ArrayList<>();
        qPredicates.add(cb.like(cb.lower(user.get("userNickname")), like));
        qPredicates.add(cb.like(cb.lower(user.get("userFullname")), like));
        qPredicates.add(cb.like(cb.lower(root.get("url")), like));
        try {
          qPredicates.add(cb.equal(root.get("id"), Long.parseLong(trimmed)));
        } catch (NumberFormatException ignored) {
          // Non-numeric search terms skip ID match
        }
        predicates.add(cb.or(qPredicates.toArray(new Predicate[0])));
      }
      if (state != null && !state.isBlank() && !"ALL".equalsIgnoreCase(state)) {
        predicates.add(cb.equal(root.get("moderationState"), ModerationState.valueOf(state.toUpperCase())));
      }
      return cb.and(predicates.toArray(new Predicate[0]));
    };
  }

  private AdminDtos.ContentItem postItem(Post post) {
    return new AdminDtos.ContentItem(
      post.getId(),
      "POST",
      truncate(post.getTitle()),
      post.getUser().getId(),
      post.getUser().getUserNickname(),
      post.getUser().getUserImage(),
      post.getModerationState().name(),
      post.getModerationReasonCode() == null ? null : post.getModerationReasonCode().name(),
      post.getModerationReason(),
      post.getCreatedAt(),
      post.getModeratedAt(),
      post.getModeratedBy(),
      reportRepository.countByTargetTypeAndTargetId(ReportTargetType.POST, post.getId())
    );
  }

  private AdminDtos.ContentItem commentItem(Comment comment) {
    return new AdminDtos.ContentItem(
      comment.getId(),
      "COMMENT",
      truncate(comment.getContent()),
      comment.getUser().getId(),
      comment.getUser().getUserNickname(),
      comment.getUser().getUserImage(),
      comment.getModerationState().name(),
      comment.getModerationReasonCode() == null ? null : comment.getModerationReasonCode().name(),
      comment.getModerationReason(),
      comment.getCreatedAt(),
      comment.getModeratedAt(),
      comment.getModeratedBy(),
      reportRepository.countByTargetTypeAndTargetId(ReportTargetType.COMMENT, comment.getId())
    );
  }

  private AdminDtos.ContentItem storyItem(Story story) {
    return new AdminDtos.ContentItem(
      story.getId(),
      "STORY",
      "Story #" + story.getId(),
      story.getUser().getId(),
      story.getUser().getUserNickname(),
      story.getUser().getUserImage(),
      story.getModerationState().name(),
      story.getModerationReasonCode() == null ? null : story.getModerationReasonCode().name(),
      story.getModerationReason(),
      story.getCreatedAt(),
      story.getModeratedAt(),
      story.getModeratedBy(),
      reportRepository.countByTargetTypeAndTargetId(ReportTargetType.STORY, story.getId())
    );
  }

  private Post findPost(Long id) {
    return postRepository
      .findById(id)
      .orElseThrow(() ->
        new ApiException(HttpStatus.NOT_FOUND, "TARGET_NOT_FOUND", "Bài viết không tồn tại.")
      );
  }

  private Comment findComment(Long id) {
    return commentRepository
      .findById(id)
      .orElseThrow(() ->
        new ApiException(HttpStatus.NOT_FOUND, "TARGET_NOT_FOUND", "Bình luận không tồn tại.")
      );
  }

  private Story findStory(Long id) {
    return storyRepository
      .findById(id)
      .orElseThrow(() ->
        new ApiException(HttpStatus.NOT_FOUND, "TARGET_NOT_FOUND", "Story không tồn tại.")
      );
  }

  private String truncate(String value) {
    if (value == null) {
      return "";
    }
    return value.length() <= 160 ? value : value.substring(0, 157) + "...";
  }

  private String trimMax(String value, int maxLength) {
    if (value == null) {
      return null;
    }
    String trimmed = value.trim();
    return trimmed.length() <= maxLength ? trimmed : trimmed.substring(0, maxLength);
  }
}
