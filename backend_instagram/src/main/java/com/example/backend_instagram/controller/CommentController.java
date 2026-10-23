package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.comment.CommentDTO;
import com.example.backend_instagram.service.CommentService;
import com.example.backend_instagram.service.CurrentUserService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/comments")
public class CommentController {

  private final CommentService commentService;
  private final CurrentUserService currentUserService;

  public CommentController(
    CommentService commentService,
    CurrentUserService currentUserService
  ) {
    this.commentService = commentService;
    this.currentUserService = currentUserService;
  }

  @GetMapping("/post/{postId}")
  public ResponseEntity<List<CommentDTO>> getCommentsByPostId(@PathVariable Long postId) {
    return ResponseEntity.ok(commentService.getCommentsByPostId(postId));
  }

  @PostMapping("/post/{postId}/user/{userId}")
  public ResponseEntity<Void> addComment(
    @PathVariable Long postId,
    @PathVariable Long userId,
    @RequestBody CommentRequest request
  ) {
    commentService.addComment(
      postId,
      currentUserService.requireCurrentUser().getId(),
      request.getContent()
    );
    return ResponseEntity.ok().build();
  }
}

class CommentRequest {
  private String content;

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }
}
