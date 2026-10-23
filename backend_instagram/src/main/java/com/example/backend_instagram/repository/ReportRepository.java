package com.example.backend_instagram.repository;

import com.example.backend_instagram.entity.Report;
import com.example.backend_instagram.entity.ReportStatus;
import com.example.backend_instagram.entity.ReportTargetType;
import com.example.backend_instagram.entity.User;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportRepository
    extends JpaRepository<Report, Long>, JpaSpecificationExecutor<Report> {

  boolean existsByReporterIdAndTargetTypeAndTargetId(
    Long reporterId,
    ReportTargetType targetType,
    Long targetId
  );

  long countByReporterIdAndCreatedAtAfter(Long reporterId, Instant after);

  long countByStatus(ReportStatus status);

  long countByTargetTypeAndTargetId(ReportTargetType targetType, Long targetId);

  List<Report> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(
    ReportTargetType targetType,
    Long targetId
  );

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
    """
    UPDATE Report r
    SET r.status = com.example.backend_instagram.entity.ReportStatus.CLAIMED,
        r.assignee = :assignee,
        r.claimedAt = :claimedAt
    WHERE r.id = :id
      AND r.status = com.example.backend_instagram.entity.ReportStatus.OPEN
      AND r.assignee IS NULL
    """
  )
  int claim(
    @Param("id") Long id,
    @Param("assignee") User assignee,
    @Param("claimedAt") Instant claimedAt
  );

  @Query(
    value = """
    SELECT AVG(TIMESTAMPDIFF(SECOND, created_at, decided_at))
    FROM reports
    WHERE decided_at IS NOT NULL
    """,
    nativeQuery = true
  )
  Double averageResolutionSeconds();

  @Query(
    value = """
    SELECT DATE_FORMAT(CONVERT_TZ(r.decided_at, '+00:00', '+07:00'), '%Y-%m-%d') AS day,
           r.status AS status,
           COUNT(*) AS total
    FROM reports r
    WHERE r.decided_at IS NOT NULL
      AND r.decided_at >= :from
    GROUP BY day, r.status
    ORDER BY day
    """,
    nativeQuery = true
  )
  List<Object[]> countDecidedByDay(@Param("from") Instant from);

  @Query(
    value = """
    SELECT r.reason_code AS reason_code, COUNT(*) AS total
    FROM reports r
    WHERE r.created_at >= :from
    GROUP BY r.reason_code
    ORDER BY total DESC
    LIMIT 5
    """,
    nativeQuery = true
  )
  List<Object[]> topReasons(@Param("from") Instant from);
}
