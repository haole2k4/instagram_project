package com.example.backend_instagram.repository;

import com.example.backend_instagram.entity.Story;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StoryRepository
    extends JpaRepository<Story, Long>, JpaSpecificationExecutor<Story> {

  List<Story> findByUserId(Long userId);

  List<Story> findByStatusAndCreatedAtBefore(Integer status, LocalDateTime createdAt);

  @EntityGraph(attributePaths = "user")
  @Query(
    """
    SELECT s FROM Story s
    WHERE s.user.id = :userId AND s.status = 1
      AND (s.access = 'PUBLIC' OR s.access IS NULL)
      AND s.moderationState = com.example.backend_instagram.entity.ModerationState.VISIBLE
      AND s.user.status = com.example.backend_instagram.entity.UserStatus.ACTIVE
    ORDER BY s.createdAt DESC
    """
  )
  List<Story> findPublicByUserId(@Param("userId") Long userId);

  @EntityGraph(attributePaths = "user")
  @Query(
    """
    SELECT s FROM Story s
    WHERE s.status = 1
      AND (s.access = 'PUBLIC' OR s.access IS NULL)
      AND s.moderationState = com.example.backend_instagram.entity.ModerationState.VISIBLE
      AND s.user.status = com.example.backend_instagram.entity.UserStatus.ACTIVE
    ORDER BY s.createdAt DESC
    """
  )
  List<Story> findAllPublic();

  @EntityGraph(attributePaths = "user")
  @Query(
    """
    SELECT s FROM Story s
    WHERE s.user.id IN :userIds AND s.access = 'PUBLIC' AND s.status = 1
      AND s.createdAt >= :createdAt
      AND s.moderationState = com.example.backend_instagram.entity.ModerationState.VISIBLE
      AND s.user.status = com.example.backend_instagram.entity.UserStatus.ACTIVE
    ORDER BY s.createdAt DESC
    """
  )
  List<Story> findPublicFollowing(
      @Param("userIds") List<Long> userIds,
      @Param("createdAt") LocalDateTime createdAt);
}
