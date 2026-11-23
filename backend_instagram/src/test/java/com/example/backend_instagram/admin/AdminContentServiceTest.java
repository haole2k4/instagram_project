package com.example.backend_instagram.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.backend_instagram.dto.admin.AdminDtos;
import com.example.backend_instagram.entity.ContentAction;
import com.example.backend_instagram.entity.ModerationState;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.ReasonCode;
import com.example.backend_instagram.entity.Role;
import com.example.backend_instagram.entity.RoleCode;
import com.example.backend_instagram.entity.Story;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.repository.CommentRepository;
import com.example.backend_instagram.repository.PostRepository;
import com.example.backend_instagram.repository.ReportRepository;
import com.example.backend_instagram.repository.StoryRepository;
import com.example.backend_instagram.service.AdminContentService;
import com.example.backend_instagram.service.AuditService;
import com.example.backend_instagram.service.CurrentUserService;
import com.example.backend_instagram.service.NotificationService;
import com.example.backend_instagram.utils.constant.CacheNames;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ExtendWith(MockitoExtension.class)
class AdminContentServiceTest {

    @Mock
    private PostRepository postRepository;
    @Mock
    private CommentRepository commentRepository;
    @Mock
    private StoryRepository storyRepository;
    @Mock
    private ReportRepository reportRepository;
    @Mock
    private CurrentUserService currentUserService;
    @Mock
    private AuditService auditService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private CacheManager cacheManager;
    @Mock
    private Cache postsCache;
    @Mock
    private Cache commentsCache;
    @Mock
    private Cache statsCache;

    private AdminContentService adminContentService;

    @BeforeEach
    void setUp() {
        adminContentService = new AdminContentService(
                postRepository,
                commentRepository,
                storyRepository,
                reportRepository,
                currentUserService,
                auditService,
                notificationService,
                cacheManager);
    }

    @Test
    void evictsPostsCommentsAndUserStatsOnlyAfterCommit() {
        User mod = new User();
        mod.setId(1L);
        Role role = new Role();
        role.setCode(RoleCode.ADMIN);
        mod.addRole(role);

        User author = new User();
        author.setId(2L);
        author.setUserNickname("author");

        Post post = new Post();
        post.setId(10L);
        post.setUser(author);
        post.setTitle("Test");
        post.setModerationState(ModerationState.VISIBLE);

        when(currentUserService.requireCurrentUser()).thenReturn(mod);
        when(postRepository.findById(10L)).thenReturn(Optional.of(post));
        when(cacheManager.getCache(CacheNames.POSTS)).thenReturn(postsCache);
        when(cacheManager.getCache(CacheNames.COMMENTS)).thenReturn(commentsCache);
        when(cacheManager.getCache(CacheNames.USER_STATS)).thenReturn(statsCache);

        TransactionSynchronizationManager.initSynchronization();
        try {
            adminContentService.moderate(
                    "POST",
                    10L,
                    new AdminDtos.ModerateRequest(ContentAction.HIDE, ReasonCode.SPAM, "spam"));

            verify(postsCache, org.mockito.Mockito.never()).clear();
            verify(commentsCache, org.mockito.Mockito.never()).clear();
            verify(statsCache, org.mockito.Mockito.never()).clear();

            for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCommit();
            }

            verify(postsCache).clear();
            verify(commentsCache).clear();
            verify(statsCache).clear();
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void listStoriesPassesQueryFilter() {
        User author = new User();
        author.setId(2L);
        author.setUserNickname("linh_demo");

        Story story = new Story();
        story.setId(7L);
        story.setUser(author);
        story.setModerationState(ModerationState.VISIBLE);
        story.setCreatedAt(LocalDateTime.now());

        when(storyRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(story)));

        Page<AdminDtos.ContentItem> result = adminContentService.list("STORY", "linh", "ALL", 0, 20);
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).authorNickname()).isEqualTo("linh_demo");
    }
}
