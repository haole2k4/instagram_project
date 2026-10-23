package com.example.backend_instagram.repository;

import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.entity.UserStatus;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
  User findByUserEmail(String userEmail);

  boolean existsByUserEmail(String userEmail);

  boolean existsByUserNickname(String userNickname);

  User findByRefreshTokenAndUserEmail(String refreshToken, String userEmail);

  long countByStatus(UserStatus status);

  long countByCreatedAtAfter(LocalDateTime after);

  List<User> findByStatusAndSuspendedUntilBefore(UserStatus status, Instant before);

  @Query(
    """
    SELECT COUNT(DISTINCT u.id) FROM User u JOIN u.roles r
    WHERE r.code = com.example.backend_instagram.entity.RoleCode.ADMIN
    AND u.status = com.example.backend_instagram.entity.UserStatus.ACTIVE
    """
  )
  long countActiveAdmins();

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
    """
    SELECT u FROM User u JOIN u.roles r
    WHERE r.code = com.example.backend_instagram.entity.RoleCode.ADMIN
    AND u.status = com.example.backend_instagram.entity.UserStatus.ACTIVE
    """
  )
  List<User> findActiveAdminsForUpdate();
}
