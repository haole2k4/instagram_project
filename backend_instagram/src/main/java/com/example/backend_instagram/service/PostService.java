package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.post.CreatePostRequest;
import com.example.backend_instagram.dto.post.PostResponseDTO;
import com.example.backend_instagram.entity.Follow;
import com.example.backend_instagram.entity.Media;
import com.example.backend_instagram.entity.ModerationState;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.entity.UserStatus;
import com.example.backend_instagram.repository.FollowRepository;
import com.example.backend_instagram.repository.MediaRepository;
import com.example.backend_instagram.repository.PostRepository;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.utils.AwsS3Service;
import com.example.backend_instagram.utils.constant.CacheNames;
import com.example.backend_instagram.utils.error.ApiException;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PostService {
  private final PostRepository postRepository;
  private final UserRepository userRepository;
  private final MediaRepository mediaRepository;
  private final AwsS3Service awsS3Service;
  private final FollowRepository followRepository;
  private final AccountStatusService accountStatusService;

  public PostService(
    PostRepository postRepository,
    UserRepository userRepository,
    MediaRepository mediaRepository,
    FollowRepository followRepository,
    AwsS3Service awsS3Service,
    AccountStatusService accountStatusService
  ) {
    this.postRepository = postRepository;
    this.userRepository = userRepository;
    this.mediaRepository = mediaRepository;
    this.followRepository = followRepository;
    this.awsS3Service = awsS3Service;
    this.accountStatusService = accountStatusService;
  }

  @Transactional
  @Caching(
    evict = {
      @CacheEvict(cacheNames = CacheNames.POSTS, allEntries = true),
      @CacheEvict(cacheNames = CacheNames.USER_STATS, allEntries = true),
    }
  )
  public Post createPost(Long userId, CreatePostRequest request) {
    User user = userRepository
      .findById(userId)
      .orElseThrow(() ->
        new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "Người dùng không tồn tại.")
      );
    accountStatusService.requireWritable(user);

    Post post = new Post();
    post.setTitle(request.getTitle());
    post.setUser(user);
    post.setStatus(request.getStatus() == null ? "True" : request.getStatus());
    post.setAccess(request.getAccess() == null ? "PUBLIC" : request.getAccess());
    post.setLikesCount(0);
    post.setCommentsCount(0L);
    post.setModerationState(ModerationState.VISIBLE);
    post = postRepository.save(post);

    List<Media> mediaList = new ArrayList<>();
    if (request.getMedia() != null) {
      for (MultipartFile file : request.getMedia()) {
        try {
          String originalFilename = file.getOriginalFilename();
          String extension = originalFilename == null || !originalFilename.contains(".")
            ? ""
            : originalFilename.substring(originalFilename.lastIndexOf("."));
          String mediaType = file.getContentType() != null && file.getContentType().startsWith("image/")
            ? "IMAGE"
            : "VIDEO";
          String fileName = System.currentTimeMillis() + "_" + mediaType.toLowerCase() + extension;
          String url = awsS3Service.uploadFile(fileName, file.getBytes());

          Media media = new Media();
          media.setUrl(url);
          media.setType(mediaType);
          media.setPost(post);
          mediaList.add(mediaRepository.save(media));
        } catch (IOException e) {
          throw new IllegalStateException("Không thể xử lý tệp: " + e.getMessage());
        }
      }
    }
    post.setMedia(mediaList);
    return postRepository.save(post);
  }

  @Cacheable(cacheNames = CacheNames.POSTS, key = "'user:' + #userId")
  public List<PostResponseDTO> getAllPostsByUserId(Long userId) {
    return postRepository
      .findPublicByUserId(userId)
      .stream()
      .map(PostResponseDTO::from)
      .toList();
  }

  public List<PostResponseDTO> getOwnPostsByUserId(Long userId) {
    return postRepository
      .findOwnByUserId(userId)
      .stream()
      .map(PostResponseDTO::from)
      .toList();
  }

  @Cacheable(cacheNames = CacheNames.POSTS, key = "'all'")
  public List<PostResponseDTO> getAllPosts() {
    return postRepository
      .findAllPublic()
      .stream()
      .map(PostResponseDTO::from)
      .toList();
  }

  @CacheEvict(cacheNames = CacheNames.POSTS, allEntries = true)
  public Post savePost(Post post) {
    return postRepository.save(post);
  }

  @Transactional
  @CacheEvict(cacheNames = CacheNames.POSTS, allEntries = true)
  public Post updatePost(Long postId, CreatePostRequest request, Long actorId) {
    Post post = findPost(postId);
    assertOwner(post, actorId);
    User actor = post.getUser();
    accountStatusService.requireWritable(actor);
    if (post.getModerationState() != ModerationState.VISIBLE) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "CONTENT_HIDDEN",
        "Bài viết đang bị ẩn, không thể chỉnh sửa."
      );
    }

    post.setTitle(request.getTitle());
    post.setStatus(request.getStatus() == null ? post.getStatus() : request.getStatus());
    post.setAccess(request.getAccess() == null ? post.getAccess() : request.getAccess());

    if (request.getMedia() != null && !request.getMedia().isEmpty()) {
      post.getMedia().clear();
      List<Media> mediaList = new ArrayList<>();
      for (MultipartFile file : request.getMedia()) {
        try {
          String originalFilename = file.getOriginalFilename();
          String extension = originalFilename == null || !originalFilename.contains(".")
            ? ""
            : originalFilename.substring(originalFilename.lastIndexOf("."));
          String mediaType = file.getContentType() != null && file.getContentType().startsWith("image/")
            ? "IMAGE"
            : "VIDEO";
          String fileName = System.currentTimeMillis() + "_" + mediaType.toLowerCase() + extension;
          String url = awsS3Service.uploadFile(fileName, file.getBytes());

          Media media = new Media();
          media.setUrl(url);
          media.setType(mediaType);
          media.setPost(post);
          mediaList.add(mediaRepository.save(media));
        } catch (IOException e) {
          throw new IllegalStateException("Không thể xử lý tệp: " + e.getMessage());
        }
      }
      post.setMedia(mediaList);
    }

    return postRepository.save(post);
  }

  @Transactional
  @Caching(
    evict = {
      @CacheEvict(cacheNames = CacheNames.POSTS, allEntries = true),
      @CacheEvict(cacheNames = CacheNames.USER_STATS, allEntries = true),
    }
  )
  public void deletePost(Long postId, Long actorId) {
    Post post = findPost(postId);
    assertOwner(post, actorId);
    accountStatusService.requireWritable(post.getUser());
    post.setStatus("false");
    postRepository.save(post);
  }

  public Post getPostById(Long postId) {
    return findPost(postId);
  }

  /** Chỉ trả về bài viết mà người dùng thường được phép tương tác. */
  public Post getVisiblePost(Long postId) {
    Post post = findPost(postId);
    if (
      !"True".equals(post.getStatus()) ||
      post.getModerationState() != ModerationState.VISIBLE ||
      accountStatusService.effectiveStatus(post.getUser()) != UserStatus.ACTIVE
    ) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        "TARGET_NOT_FOUND",
        "Bài viết không tồn tại."
      );
    }
    return post;
  }

  @Cacheable(cacheNames = CacheNames.POSTS, key = "'following:' + #userId")
  public List<PostResponseDTO> getPostsFromFollowing(Long userId) {
    List<Follow> following = followRepository.findByFollowerId(userId);
    List<Long> followingIds = following
      .stream()
      .map(follow -> follow.getFollowing().getId())
      .toList();
    if (followingIds.isEmpty()) {
      return List.of();
    }
    return postRepository
      .findPublicByUserIds(followingIds)
      .stream()
      .map(PostResponseDTO::from)
      .toList();
  }

  private Post findPost(Long postId) {
    return postRepository
      .findById(postId)
      .orElseThrow(() ->
        new ApiException(HttpStatus.NOT_FOUND, "TARGET_NOT_FOUND", "Bài viết không tồn tại.")
      );
  }

  private void assertOwner(Post post, Long actorId) {
    if (actorId == null || !post.getUser().getId().equals(actorId)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        "FORBIDDEN",
        "Bạn không có quyền thay đổi bài viết này."
      );
    }
  }
}
