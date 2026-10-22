package com.example.backend_instagram.repository;

import com.example.backend_instagram.entity.Post;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PostRepository
    extends JpaRepository<Post, Long>, JpaSpecificationExecutor<Post> {

  @EntityGraph(attributePaths = { "user", "media" })
  @Query(
    """
    SELECT p FROM Post p
    WHERE p.user.id = :userId AND p.status = 'True'
      AND p.moderationState = com.example.backend_instagram.entity.ModerationState.VISIBLE
      AND p.user.status = com.example.backend_instagram.entity.UserStatus.ACTIVE
      AND (p.access = 'PUBLIC' OR p.access IS NULL)
    ORDER BY p.createdAt DESC
    """
  )
  List<Post> findPublicByUserId(@Param("userId") Long userId);

  @EntityGraph(attributePaths = { "user", "media" })
  @Query(
    """
    SELECT p FROM Post p
    WHERE p.user.id = :userId AND p.status = 'True'
      AND p.moderationState = com.example.backend_instagram.entity.ModerationState.VISIBLE
    ORDER BY p.createdAt DESC
    """
  )
  List<Post> findOwnByUserId(@Param("userId") Long userId);

  @EntityGraph(attributePaths = { "user", "media" })
  @Query(
    """
    SELECT p FROM Post p
    WHERE p.status = 'True'
      AND p.moderationState = com.example.backend_instagram.entity.ModerationState.VISIBLE
      AND p.user.status = com.example.backend_instagram.entity.UserStatus.ACTIVE
      AND (p.access = 'PUBLIC' OR p.access IS NULL)
    ORDER BY p.createdAt DESC
    """
  )
  List<Post> findAllPublic();

  @EntityGraph(attributePaths = { "user", "media" })
  @Query(
    """
    SELECT p FROM Post p
    WHERE p.user.id IN :userIds AND p.status = 'True'
      AND p.moderationState = com.example.backend_instagram.entity.ModerationState.VISIBLE
      AND p.user.status = com.example.backend_instagram.entity.UserStatus.ACTIVE
      AND (p.access = 'PUBLIC' OR p.access IS NULL)
    ORDER BY p.createdAt DESC
    """
  )
  List<Post> findPublicByUserIds(@Param("userIds") List<Long> userIds);

  long countByUserId(Long userId);

  long countByCreatedAtAfter(LocalDateTime after);
}
