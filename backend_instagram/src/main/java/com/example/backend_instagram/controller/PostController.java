package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.post.CreatePostRequest;
import com.example.backend_instagram.dto.post.PostResponseDTO;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.service.CommentService;
import com.example.backend_instagram.service.CurrentUserService;
import com.example.backend_instagram.service.LikeService;
import com.example.backend_instagram.service.PostService;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/posts")
public class PostController {
  private final PostService postService;
  private final LikeService likeService;
  private final CommentService commentService;
  private final CurrentUserService currentUserService;

  public PostController(
    PostService postService,
    LikeService likeService,
    CommentService commentService,
    CurrentUserService currentUserService
  ) {
    this.postService = postService;
    this.likeService = likeService;
    this.commentService = commentService;
    this.currentUserService = currentUserService;
  }

  @PostMapping(consumes = "multipart/form-data")
  public ResponseEntity<Post> createPost(
    @RequestParam(value = "title", required = false) String title,
    @RequestParam(value = "media", required = false) List<MultipartFile> media,
    @RequestParam(value = "status", required = false, defaultValue = "True") String status,
    @RequestParam(value = "access", required = false, defaultValue = "PUBLIC") String access
  ) {
    CreatePostRequest request = new CreatePostRequest();
    request.setTitle(title != null ? title : "");
    request.setMedia(media);
    request.setStatus(status);
    request.setAccess(access);
    return ResponseEntity.ok(
      postService.createPost(currentUserService.requireCurrentUser().getId(), request)
    );
  }

  @GetMapping("/user/{userId}")
  public ResponseEntity<List<PostResponseDTO>> getAllPostsByUserId(@PathVariable Long userId) {
    Long currentId = currentUserService.currentUserIdOrNull();
    if (currentId != null && currentId.equals(userId)) {
      return ResponseEntity.ok(postService.getOwnPostsByUserId(userId));
    }
    return ResponseEntity.ok(postService.getAllPostsByUserId(userId));
  }

  @GetMapping
  public ResponseEntity<List<PostResponseDTO>> getAllPosts() {
    return ResponseEntity.ok(postService.getAllPosts());
  }

  @PutMapping("/{postId}")
  public ResponseEntity<Post> updatePost(
    @PathVariable Long postId,
    @RequestParam("title") String title,
    @RequestParam(value = "media", required = false) List<MultipartFile> media,
    @RequestParam("status") String status,
    @RequestParam("access") String access
  ) {
    CreatePostRequest request = new CreatePostRequest();
    request.setTitle(title);
    request.setMedia(media);
    request.setStatus(status);
    request.setAccess(access);
    return ResponseEntity.ok(
      postService.updatePost(postId, request, currentUserService.requireCurrentUser().getId())
    );
  }

  @DeleteMapping("/{postId}")
  public ResponseEntity<Void> deletePost(@PathVariable Long postId) {
    postService.deletePost(postId, currentUserService.requireCurrentUser().getId());
    return ResponseEntity.ok().build();
  }

  @PostMapping("/{postId}/like")
  public ResponseEntity<Map<String, String>> likePost(@PathVariable Long postId) {
    likeService.likePost(postId, currentUserService.requireCurrentUser().getId());
    return ResponseEntity.ok(Map.of("message", "Thích bài viết thành công"));
  }

  @DeleteMapping("/{postId}/like")
  public ResponseEntity<Map<String, String>> unlikePost(@PathVariable Long postId) {
    likeService.unlikePost(postId, currentUserService.requireCurrentUser().getId());
    return ResponseEntity.ok(Map.of("message", "Bỏ thích bài viết thành công"));
  }

  @PostMapping("/{postId}/comment")
  public ResponseEntity<Map<String, String>> addComment(
    @PathVariable Long postId,
    @RequestBody Map<String, String> request
  ) {
    commentService.addComment(
      postId,
      currentUserService.requireCurrentUser().getId(),
      request.get("content")
    );
    return ResponseEntity.ok(Map.of("message", "Bình luận thành công"));
  }

  @GetMapping("/following/{userId}")
  public ResponseEntity<List<PostResponseDTO>> getPostsFromFollowing(@PathVariable Long userId) {
    return ResponseEntity.ok(
      postService.getPostsFromFollowing(currentUserService.requireCurrentUser().getId())
    );
  }

  @GetMapping("/liked/user/{userId}")
  public ResponseEntity<List<Long>> getLikedPostIdsByUser(@PathVariable Long userId) {
    return ResponseEntity.ok(
      likeService.getLikedPostIdsByUser(currentUserService.requireCurrentUser().getId())
    );
  }
}
