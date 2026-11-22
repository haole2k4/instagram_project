package com.example.backend_instagram.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.backend_instagram.dto.post.CreatePostRequest;
import com.example.backend_instagram.dto.post.PostResponseDTO;
import com.example.backend_instagram.entity.Follow;
import com.example.backend_instagram.entity.Media;
import com.example.backend_instagram.entity.ModerationState;
import com.example.backend_instagram.entity.Post;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.entity.UserStatus;
import com.example.backend_instagram.repository.FollowRepository;
import com.example.backend_instagram.repository.MediaRepository;
import com.example.backend_instagram.repository.PostRepository;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.utils.error.ApiException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class PostServiceTest {

    @Mock
    private PostRepository postRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MediaRepository mediaRepository;
    @Mock
    private FollowRepository followRepository;
    @Mock
    private AwsS3Service awsS3Service;
    @Mock
    private AccountStatusService accountStatusService;

    private PostService postService;
    private User author;

    @BeforeEach
    void setUp() {
        postService = new PostService(
                postRepository,
                userRepository,
                mediaRepository,
                followRepository,
                awsS3Service,
                accountStatusService);

        author = new User();
        author.setId(10L);
        author.setUserNickname("author");
        author.setUserEmail("secret@example.com");
        author.setUserPhone("0900000000");
        author.setUserBday("2000-01-01");
        author.setStatus(UserStatus.ACTIVE);
    }

    @Test
    void updatePostMutatesExistingMediaCollectionWithoutReplacingReference() {
        Post existing = new Post();
        existing.setId(1L);
        existing.setUser(author);
        existing.setModerationState(ModerationState.VISIBLE);
        List<Media> persistentList = new ArrayList<>();
        Media oldMedia = new Media();
        oldMedia.setId(5L);
        persistentList.add(oldMedia);
        existing.setMedia(persistentList);

        when(postRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(awsS3Service.validateMediaFile(any()))
                .thenReturn(new AwsS3Service.ValidatedMedia("IMAGE", ".png", "image/png"));
        when(awsS3Service.uploadFile(anyString(), any())).thenReturn("https://cdn.example/new.png");
        when(mediaRepository.save(any(Media.class))).thenAnswer(inv -> inv.getArgument(0));
        when(postRepository.save(any(Post.class))).thenAnswer(inv -> inv.getArgument(0));

        CreatePostRequest req = new CreatePostRequest();
        req.setTitle("Updated");
        req.setStatus("True");
        req.setAccess("PUBLIC");
        req.setMedia(List.of(new MockMultipartFile("media", "new.png", "image/png", new byte[] { 1, 2 })));

        Post updated = postService.updatePost(1L, req, 10L);

        assertThat(updated.getMedia()).isSameAs(persistentList);
        assertThat(updated.getMedia()).hasSize(1);
        assertThat(updated.getMedia().get(0).getUrl()).isEqualTo("https://cdn.example/new.png");
        verify(postRepository).save(existing);
    }

    @Test
    void enforcesPrivateAndOnlyFriendAccessOnGetVisiblePost() {
        Post privatePost = new Post();
        privatePost.setId(2L);
        privatePost.setUser(author);
        privatePost.setStatus("True");
        privatePost.setModerationState(ModerationState.VISIBLE);
        privatePost.setAccess("PRIVATE");

        when(accountStatusService.effectiveStatus(author)).thenReturn(UserStatus.ACTIVE);
        when(postRepository.findById(2L)).thenReturn(Optional.of(privatePost));

        assertThat(postService.getVisiblePost(2L, 10L)).isSameAs(privatePost);
        assertThatThrownBy(() -> postService.getVisiblePost(2L, 99L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        Post friendPost = new Post();
        friendPost.setId(3L);
        friendPost.setUser(author);
        friendPost.setStatus("True");
        friendPost.setModerationState(ModerationState.VISIBLE);
        friendPost.setAccess("ONLY_FRIEND");

        when(postRepository.findById(3L)).thenReturn(Optional.of(friendPost));
        when(followRepository.findBetweenUsers(10L, 99L)).thenReturn(List.of());

        assertThatThrownBy(() -> postService.getVisiblePost(3L, 99L))
                .isInstanceOf(ApiException.class)
                .satisfies(ex -> assertThat(((ApiException) ex).getStatus()).isEqualTo(HttpStatus.NOT_FOUND));

        User friend = new User();
        friend.setId(20L);
        Follow f1 = new Follow();
        f1.setFriend(true);
        f1.setBlocking(false);
        Follow f2 = new Follow();
        f2.setFriend(true);
        f2.setBlocking(false);
        when(followRepository.findBetweenUsers(10L, 20L)).thenReturn(List.of(f1, f2));

        assertThat(postService.getVisiblePost(3L, 20L)).isSameAs(friendPost);
    }

    @Test
    void postResponseAuthorDoesNotExposePiiFields() {
        Post post = new Post();
        post.setId(1L);
        post.setUser(author);
        post.setTitle("Hello");

        PostResponseDTO dto = PostResponseDTO.from(post);
        assertThat(dto.getUser().getUserNickname()).isEqualTo("author");
        assertThat(PostResponseDTO.Author.class.getDeclaredFields())
                .extracting(java.lang.reflect.Field::getName)
                .doesNotContain("userEmail", "userPhone", "userBday");
    }
}
