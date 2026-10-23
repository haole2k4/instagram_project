package com.example.backend_instagram.controller;

import com.example.backend_instagram.entity.Story;
import com.example.backend_instagram.service.CurrentUserService;
import com.example.backend_instagram.service.StoryService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/stories")
public class StoryController {
  private final StoryService storyService;
  private final CurrentUserService currentUserService;

  public StoryController(StoryService storyService, CurrentUserService currentUserService) {
    this.storyService = storyService;
    this.currentUserService = currentUserService;
  }

  @PostMapping(consumes = "multipart/form-data")
  public ResponseEntity<Story> createStory(
    @RequestParam(value = "userId", required = false) Long ignoredUserId,
    @RequestParam("file") MultipartFile file,
    @RequestParam("access") String access,
    @RequestParam("status") Integer status
  ) {
    return ResponseEntity.ok(
      storyService.createStory(
        currentUserService.requireCurrentUser().getId(),
        file,
        access,
        status
      )
    );
  }

  @GetMapping("/user/{userId}")
  public ResponseEntity<List<Story>> getStoriesByUserId(@PathVariable Long userId) {
    return ResponseEntity.ok(storyService.getStoriesByUserId(userId));
  }

  @GetMapping
  public ResponseEntity<List<Story>> getAllStories() {
    return ResponseEntity.ok(storyService.getAllStories());
  }

  @DeleteMapping("/{storyId}")
  public ResponseEntity<Void> deleteStory(@PathVariable Long storyId) {
    storyService.deleteStory(storyId, currentUserService.requireCurrentUser().getId());
    return ResponseEntity.ok().build();
  }

  @GetMapping("/following/{userId}")
  public ResponseEntity<List<Story>> getStoriesFromFollowing(@PathVariable Long userId) {
    return ResponseEntity.ok(
      storyService.getStoriesFromFollowing(currentUserService.requireCurrentUser().getId())
    );
  }
}
