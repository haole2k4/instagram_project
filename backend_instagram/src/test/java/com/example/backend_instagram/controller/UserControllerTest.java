package com.example.backend_instagram.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend_instagram.dto.user.RestResponse;
import com.example.backend_instagram.dto.user.RestUpdateUser;
import com.example.backend_instagram.dto.user.UserStatsDTO;
import com.example.backend_instagram.entity.ReasonCode;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.entity.UserStatus;
import com.example.backend_instagram.service.AccountStatusService;
import com.example.backend_instagram.service.AwsS3Service;
import com.example.backend_instagram.service.UserPrivacyService;
import com.example.backend_instagram.service.UserService;
import com.example.backend_instagram.utils.FormatRestresponse;
import com.example.backend_instagram.utils.error.GlobalException;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

  @Mock
  private UserService userService;

  @Mock
  private AwsS3Service awsS3Service;

  @Mock
  private AccountStatusService accountStatusService;

  @Mock
  private UserPrivacyService userPrivacyService;

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    UserController controller = new UserController(
      userService,
      awsS3Service,
      accountStatusService,
      userPrivacyService
    );
    mockMvc = MockMvcBuilders
      .standaloneSetup(controller, new TestEdgeController())
      .setControllerAdvice(new GlobalException(), new FormatRestresponse())
      .build();
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void getAllUsersOmitsPiiAndSensitiveFields() throws Exception {
    User alice = sampleUser(1L, "alice", UserStatus.ACTIVE);
    when(userService.getAllUser()).thenReturn(List.of(alice));

    mockMvc
      .perform(get("/api/v1/user/all"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.data[0].id").value(1))
      .andExpect(jsonPath("$.data[0].userNickname").value("alice"))
      .andExpect(jsonPath("$.data[0].isOnline").value(true))
      .andExpect(jsonPath("$.data[0].userEmail").doesNotExist())
      .andExpect(jsonPath("$.data[0].userPhone").doesNotExist())
      .andExpect(jsonPath("$.data[0].socketId").doesNotExist())
      .andExpect(jsonPath("$.data[0].statusReason").doesNotExist())
      .andExpect(jsonPath("$.data[0].statusReasonCode").doesNotExist())
      .andExpect(jsonPath("$.data[0].statusChangedBy").doesNotExist())
      .andExpect(jsonPath("$.data[0].userPassword").doesNotExist())
      .andExpect(jsonPath("$.data[0].refreshToken").doesNotExist());
  }

  @Test
  void getUserByIdHidesPrivateFieldsForOtherUsersAndShowsForSelf() throws Exception {
    User target = sampleUser(2L, "bob", UserStatus.ACTIVE);
    when(userService.getUserById(2L)).thenReturn(target);
    when(accountStatusService.isRestricted(target)).thenReturn(false);

    authenticateAs(1L, "USER");
    mockMvc
      .perform(get("/api/v1/user/2"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.data.userNickname").value("bob"))
      .andExpect(jsonPath("$.data.userEmail").doesNotExist())
      .andExpect(jsonPath("$.data.userPhone").doesNotExist())
      .andExpect(jsonPath("$.data.userBday").doesNotExist());

    authenticateAs(2L, "USER");
    mockMvc
      .perform(get("/api/v1/user/2"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.data.userEmail").value("bob@example.com"))
      .andExpect(jsonPath("$.data.userPhone").value("0901234567"))
      .andExpect(jsonPath("$.data.userBday").value("2000-01-01"));
  }

  @Test
  void getUserStatsHidesRestrictedUserUnlessSelfOrStaff() throws Exception {
    User restricted = sampleUser(3L, "banned_user", UserStatus.BANNED);
    when(userService.getUserById(3L)).thenReturn(restricted);
    when(accountStatusService.isRestricted(restricted)).thenReturn(true);

    authenticateAs(1L, "USER");
    mockMvc
      .perform(get("/api/v1/stats/3"))
      .andExpect(status().isNotFound())
      .andExpect(jsonPath("$.error").value("USER_NOT_FOUND"));

    UserStatsDTO stats = UserStatsDTO.from(restricted, 10L, 5L, 2L);
    when(userService.getUserStats(3L)).thenReturn(stats);

    authenticateAs(3L, "USER");
    mockMvc
      .perform(get("/api/v1/stats/3"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.data.followersCount").value(10));

    authenticateAs(99L, "MODERATOR");
    mockMvc
      .perform(get("/api/v1/stats/3"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.data.postsCount").value(2));
  }

  @Test
  void updateUserSkipsBase64DecodeForHttpUrlAndForwardsFields() throws Exception {
    authenticateAs(1L, "USER");
    User updated = sampleUser(1L, "new_nick", UserStatus.ACTIVE);
    RestUpdateUser responseDto = new RestUpdateUser();
    responseDto.setId(1L);
    responseDto.setUserNikName("new_nick");
    responseDto.setName("Alice Updated");
    responseDto.setUserGender("female");
    responseDto.setUserBday("1999-05-05");
    responseDto.setUserImage("https://cdn.example.com/avatar.png");

    when(userService.handleUpdateUser(any(User.class))).thenReturn(updated);
    when(userService.convertToResUpdateUpdateUserDTO(updated)).thenReturn(responseDto);

    String payload = """
      {
        "id": 999,
        "userNickname": "new_nick",
        "userFullname": "Alice Updated",
        "userGender": "female",
        "userBday": "1999-05-05",
        "userImage": "https://cdn.example.com/avatar.png"
      }
      """;

    mockMvc
      .perform(put("/api/v1/user").contentType(MediaType.APPLICATION_JSON).content(payload))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.data.userNikName").value("new_nick"))
      .andExpect(jsonPath("$.data.userImage").value("https://cdn.example.com/avatar.png"));

    verify(awsS3Service, never()).uploadFile(any(), any());
    ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
    verify(userService).handleUpdateUser(captor.capture());
    assertThat(captor.getValue().getId()).isEqualTo(1L);
    assertThat(captor.getValue().getUserFullname()).isEqualTo("Alice Updated");
    assertThat(captor.getValue().getUserGender()).isEqualTo("female");
    assertThat(captor.getValue().getUserBday()).isEqualTo("1999-05-05");
  }

  @Test
  void globalExceptionMapsSecurityUploadConflictAndUnexpectedErrors() throws Exception {
    mockMvc
      .perform(get("/test-edge/denied"))
      .andExpect(status().isForbidden())
      .andExpect(jsonPath("$.statusCode").value(403))
      .andExpect(jsonPath("$.error").value("FORBIDDEN"));

    mockMvc
      .perform(get("/test-edge/too-large"))
      .andExpect(status().is(413))
      .andExpect(jsonPath("$.statusCode").value(413))
      .andExpect(jsonPath("$.error").value("PAYLOAD_TOO_LARGE"));

    mockMvc
      .perform(get("/test-edge/conflict"))
      .andExpect(status().isConflict())
      .andExpect(jsonPath("$.statusCode").value(409))
      .andExpect(jsonPath("$.error").value("CONFLICT"));

    mockMvc
      .perform(get("/test-edge/boom"))
      .andExpect(status().isInternalServerError())
      .andExpect(jsonPath("$.statusCode").value(500))
      .andExpect(jsonPath("$.error").value("INTERNAL_ERROR"))
      .andExpect(jsonPath("$.message").value("Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."));
  }

  @Test
  void formatRestResponseDoesNotDoubleWrapAndSkipsActuator() throws Exception {
    mockMvc
      .perform(get("/test-edge/already-wrapped"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.statusCode").value(200))
      .andExpect(jsonPath("$.data").value("inner"));

    mockMvc
      .perform(get("/actuator/health"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.status").value("UP"))
      .andExpect(jsonPath("$.data").doesNotExist());
  }

  private void authenticateAs(Long userId, String role) {
    Jwt jwt = Jwt.withTokenValue("token")
      .header("alg", "HS512")
      .subject("user" + userId + "@example.com")
      .issuedAt(Instant.now())
      .expiresAt(Instant.now().plusSeconds(60))
      .claim("userId", userId)
      .claim("token_type", "access")
      .build();
    SecurityContextHolder.getContext().setAuthentication(
      new UsernamePasswordAuthenticationToken(
        jwt,
        "token",
        List.of(new SimpleGrantedAuthority("ROLE_" + role))
      )
    );
  }

  private User sampleUser(Long id, String nickname, UserStatus status) {
    User user = new User();
    user.setId(id);
    user.setUserNickname(nickname);
    user.setUserFullname(nickname + " Full");
    user.setUserEmail(nickname.equals("bob") ? "bob@example.com" : nickname + "@example.com");
    user.setUserPhone("0901234567");
    user.setUserBday("2000-01-01");
    user.setUserPassword("hashed");
    user.setRefreshToken("secret-refresh");
    user.setSocketId("sock-123");
    user.setStatus(status);
    user.setStatusReason("spam");
    user.setStatusReasonCode(ReasonCode.SPAM);
    user.setStatusChangedBy(99L);
    user.setIsOnline(true);
    return user;
  }

  @RestController
  static class TestEdgeController {

    @GetMapping("/test-edge/denied")
    public String denied() {
      throw new AccessDeniedException("secret internal acl detail");
    }

    @GetMapping("/test-edge/too-large")
    public String tooLarge() {
      throw new MaxUploadSizeExceededException(50_000_000L);
    }

    @GetMapping("/test-edge/conflict")
    public String conflict() {
      throw new DataIntegrityViolationException("duplicate key uk_nickname");
    }

    @GetMapping("/test-edge/boom")
    public String boom() {
      throw new RuntimeException("jdbc:mysql://secret-host:3306");
    }

    @GetMapping("/test-edge/already-wrapped")
    public RestResponse<String> alreadyWrapped() {
      RestResponse<String> res = new RestResponse<>();
      res.setStatusCode(200);
      res.setMessage("ok");
      res.setData("inner");
      return res;
    }

    @GetMapping("/actuator/health")
    public java.util.Map<String, String> actuatorHealth() {
      return java.util.Map.of("status", "UP");
    }
  }
}
