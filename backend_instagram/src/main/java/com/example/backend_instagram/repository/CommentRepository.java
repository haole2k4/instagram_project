package com.example.backend_instagram.repository;

import com.example.backend_instagram.entity.Comment;
import com.example.backend_instagram.entity.Post;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentRepository
    extends JpaRepository<Comment, Long>, JpaSpecificationExecutor<Comment> {

  @EntityGraph(attributePaths = { "user", "post" })
  @Query(
    """
    SELECT c FROM Comment c
    WHERE c.post = :post
      AND c.moderationState = com.example.backend_instagram.entity.ModerationState.VISIBLE
      AND c.user.status = com.example.backend_instagram.entity.UserStatus.ACTIVE
    ORDER BY c.createdAt DESC
    """
  )
  List<Comment> findPublicByPostOrderByCreatedAtDesc(@Param("post") Post post);

  @Query(
    """
    SELECT COUNT(c) FROM Comment c
    WHERE c.post = :post
      AND c.moderationState = com.example.backend_instagram.entity.ModerationState.VISIBLE
      AND c.user.status = com.example.backend_instagram.entity.UserStatus.ACTIVE
    """
  )
  Long countPublicByPost(@Param("post") Post post);
}
