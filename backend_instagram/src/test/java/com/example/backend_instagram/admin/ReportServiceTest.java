package com.example.backend_instagram.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.entity.ModerationAction;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.ReasonCode;
import com.example.backend_instagram.entity.Report;
import com.example.backend_instagram.entity.ReportStatus;
import com.example.backend_instagram.entity.ReportTargetType;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.CommentRepository;
import com.example.backend_instagram.repository.PostRepository;
import com.example.backend_instagram.repository.ReportRepository;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.service.AccountStatusService;
import com.example.backend_instagram.service.AdminContentService;
import com.example.backend_instagram.service.AdminUserService;
import com.example.backend_instagram.service.AuditService;
import com.example.backend_instagram.service.CurrentUserService;
import com.example.backend_instagram.service.NotificationService;
import com.example.backend_instagram.service.ReportService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private ReportRepository reportRepository;
    @Mock
    private PostRepository postRepository;
    @Mock
    private CommentRepository commentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CurrentUserService currentUserService;
    @Mock
    private AccountStatusService accountStatusService;
    @Mock
    private AdminContentService adminContentService;
    @Mock
    private AdminUserService adminUserService;
    @Mock
    private AuditService auditService;
    @Mock
    private NotificationService notificationService;

    private ReportService reportService;

    @BeforeEach
    void setUp() {
        reportService = new ReportService(
                reportRepository,
                postRepository,
                commentRepository,
                userRepository,
                currentUserService,
                accountStatusService,
                adminContentService,
                adminUserService,
                auditService,
                notificationService);
    }

    @Test
    @SuppressWarnings("unchecked")
    void listGracefullyHandlesDeletedTargetsInsteadOf404() {
        User reporter = new User();
        reporter.setId(5L);
        reporter.setUserNickname("reporter");

        Report missingPostReport = new Report();
        missingPostReport.setId(1L);
        missingPostReport.setReporter(reporter);
        missingPostReport.setTargetType(ReportTargetType.POST);
        missingPostReport.setTargetId(999L);
        missingPostReport.setReasonCode(ReasonCode.SPAM);
        missingPostReport.setStatus(ReportStatus.OPEN);
        missingPostReport.setCreatedAt(Instant.now());

        when(currentUserService.currentUserIdOrNull()).thenReturn(1L);
        when(reportRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(missingPostReport)));
        when(postRepository.findById(999L)).thenReturn(Optional.empty());

        Page<AdminDtos.ReportView> page = reportService.list("OPEN", null, null, null, 0, 20);
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().get(0).targetPreview()).isEqualTo("[Deleted content]");
        assertThat(page.getContent().get(0).targetAuthorId()).isNull();
    }

    @Test
    void decideResolvesTargetOnceAndClampsModerationReasonTo500Chars() {
        User moderator = new User();
        moderator.setId(1L);
        moderator.setUserNickname("mod");

        User reporter = new User();
        reporter.setId(2L);
        reporter.setUserNickname("rep");

        User author = new User();
        author.setId(3L);
        author.setUserNickname("author");

        Post post = new Post();
        post.setId(50L);
        post.setUser(author);
        post.setTitle("Spam post");

        Report report = new Report();
        report.setId(10L);
        report.setReporter(reporter);
        report.setTargetType(ReportTargetType.POST);
        report.setTargetId(50L);
        report.setReasonCode(ReasonCode.SPAM);
        report.setStatus(ReportStatus.OPEN);
        report.setCreatedAt(Instant.now());

        String longNote = "x".repeat(750);
        when(currentUserService.requireCurrentUser()).thenReturn(moderator);
        when(reportRepository.findById(10L)).thenReturn(Optional.of(report));
        when(postRepository.findById(50L)).thenReturn(Optional.of(post));

        AdminDtos.ReportView result = reportService.decide(
                10L,
                new AdminDtos.DecisionRequest(ModerationAction.HIDE_CONTENT, ReasonCode.SPAM, longNote, null));

        verify(postRepository, times(1)).findById(50L);

        ArgumentCaptor<AdminDtos.ModerateRequest> modReq = ArgumentCaptor.forClass(AdminDtos.ModerateRequest.class);
        verify(adminContentService).moderate(eq("POST"), eq(50L), modReq.capture());
        assertThat(modReq.getValue().note()).hasSize(500);
        assertThat(result.decisionNote()).hasSize(750);
    }
}
