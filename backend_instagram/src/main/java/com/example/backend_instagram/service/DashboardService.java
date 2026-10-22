package com.example.backend_instagram.service;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.entity.ReportStatus;
import com.example.backend_instagram.repository.PostRepository;
import com.example.backend_instagram.repository.ReportRepository;
import com.example.backend_instagram.repository.UserRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {
  private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

  private final UserRepository userRepository;
  private final PostRepository postRepository;
  private final ReportRepository reportRepository;

  public DashboardService(
    UserRepository userRepository,
    PostRepository postRepository,
    ReportRepository reportRepository
  ) {
    this.userRepository = userRepository;
    this.postRepository = postRepository;
    this.reportRepository = reportRepository;
  }

  @Transactional(readOnly = true)
  public AdminDtos.Dashboard overview(int requestedDays) {
    int days = Math.min(Math.max(requestedDays, 1), 90);
    LocalDate today = LocalDate.now(ZONE);
    LocalDate firstDay = today.minusDays(days - 1L);
    Instant from = firstDay.atStartOfDay(ZONE).toInstant();

    Map<String, long[]> byDay = new LinkedHashMap<>();
    for (int i = 0; i < days; i++) {
      byDay.put(firstDay.plusDays(i).toString(), new long[] { 0, 0 });
    }
    for (Object[] row : reportRepository.countDecidedByDay(from)) {
      String day = String.valueOf(row[0]);
      String status = String.valueOf(row[1]);
      long total = ((Number) row[2]).longValue();
      long[] counts = byDay.get(day);
      if (counts != null) {
        if (ReportStatus.RESOLVED.name().equals(status)) {
          counts[0] += total;
        } else if (ReportStatus.DISMISSED.name().equals(status)) {
          counts[1] += total;
        }
      }
    }
    List<AdminDtos.DayCount> processed = new ArrayList<>();
    byDay.forEach((day, counts) ->
      processed.add(new AdminDtos.DayCount(day, counts[0], counts[1]))
    );

    Double avgSeconds = reportRepository.averageResolutionSeconds();
    Double avgHours = null;
    if (avgSeconds != null) {
      avgHours = Math.round((avgSeconds / 3600.0) * 10.0) / 10.0;
    }

    List<AdminDtos.ReasonCount> topReasons = new ArrayList<>();
    for (Object[] row : reportRepository.topReasons(from)) {
      topReasons.add(
        new AdminDtos.ReasonCount(
          String.valueOf(row[0]),
          ((Number) row[1]).longValue()
        )
      );
    }

    return new AdminDtos.Dashboard(
      userRepository.count(),
      userRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(days)),
      postRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(days)),
      new AdminDtos.ReportCounts(
        reportRepository.countByStatus(ReportStatus.OPEN),
        reportRepository.countByStatus(ReportStatus.CLAIMED),
        reportRepository.countByStatus(ReportStatus.RESOLVED),
        reportRepository.countByStatus(ReportStatus.DISMISSED)
      ),
      processed,
      avgHours,
      topReasons
    );
  }
}
