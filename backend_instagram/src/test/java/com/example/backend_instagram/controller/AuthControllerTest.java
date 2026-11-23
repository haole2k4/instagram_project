package com.example.backend_instagram.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend_instagram.config.SecurityConfiguration;
import com.example.backend_instagram.dto.user.ResCreateUserDTO;
import com.example.backend_instagram.dto.user.RestLogin;
import com.example.backend_instagram.entity.Role;
import com.example.backend_instagram.entity.RoleCode;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.entity.UserStatus;
import com.example.backend_instagram.service.AccountStatusService;
import com.example.backend_instagram.service.RoleService;
import com.example.backend_instagram.service.UserService;
import com.example.backend_instagram.utils.FormatRestresponse;
import com.example.backend_instagram.utils.SecurityUtils;
import com.example.backend_instagram.utils.error.GlobalException;
import jakarta.servlet.http.Cookie;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

  private static final String TEST_SECRET =
    "dGVzdC1vbmx5LWp3dC1rZXktNjQtYnl0ZXMtbWluaW11bS1mb3ItaHM1MTItc2lnbmluZy12ZXJpZmljYXRpb24h";

  @Mock
  private AuthenticationManagerBuilder authenticationManagerBuilder;

  @Mock
  private AuthenticationManager authenticationManager;

  @Mock
  private UserService userService;

  @Mock
  private RoleService roleService;

  @Mock
  private AccountStatusService accountStatusService;

  private PasswordEncoder passwordEncoder;
  private SecurityUtils securityUtils;
  private JwtDecoder accessJwtDecoder;
  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    passwordEncoder = new BCryptPasswordEncoder();
    SecurityConfiguration securityConfig = new SecurityConfiguration();
    ReflectionTestUtils.setField(securityConfig, "jwtKey", TEST_SECRET);
    JwtEncoder jwtEncoder = securityConfig.jwtEncoder();
    accessJwtDecoder = securityConfig.jwtDecoder();

    securityUtils = new SecurityUtils(jwtEncoder);
    ReflectionTestUtils.setField(securityUtils, "jwtKey", TEST_SECRET);
    ReflectionTestUtils.setField(securityUtils, "jwtKeyExpiration", 1800L);
    ReflectionTestUtils.setField(securityUtils, "refreshToken", 604800L);

    AuthController controller = new AuthController(
      authenticationManagerBuilder,
      securityUtils,
      userService,
      passwordEncoder,
      roleService,
      accountStatusService
    );
    ReflectionTestUtils.setField(controller, "authCookieSecure", false);
    ReflectionTestUtils.setField(controller, "authCookieSameSite", "Lax");
    ReflectionTestUtils.setField(controller, "refreshCookieMaxAge", 604800L);

    mockMvc = MockMvcBuilders
      .standaloneSetup(controller)
      .setControllerAdvice(new GlobalException(), new FormatRestresponse())
      .build();
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void registerBindsRegisterDtoAndCreatesUser() throws Exception {
    when(userService.handleGetUserByUserNawm("new@example.com")).thenReturn(null);
    when(userService.isNikNameExsit("newbie")).thenReturn(false);

    ResCreateUserDTO dto = new ResCreateUserDTO();
    dto.setId(10L);
    dto.setEmail("new@example.com");
    dto.setName("New User");
    dto.setUserNikName("newbie");

    when(userService.createUser(any(User.class))).thenAnswer(inv -> {
      User u = inv.getArgument(0);
      u.setId(10L);
      return u;
    });
    when(userService.convertToResCreateUserDTO(any(User.class))).thenReturn(dto);

    String body = """
      {
        "userEmail": "new@example.com",
        "userPassword": "secret123",
        "userFullname": "New User",
        "userNickname": "newbie"
      }
      """;

    mockMvc
      .perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
      .andExpect(status().isCreated())
      .andExpect(jsonPath("$.statusCode").value(201))
      .andExpect(jsonPath("$.data.email").value("new@example.com"))
      .andExpect(jsonPath("$.data.userNikName").value("newbie"));

    ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
    verify(userService).createUser(userCaptor.capture());
    User saved = userCaptor.getValue();
    assertThat(passwordEncoder.matches("secret123", saved.getUserPassword())).isTrue();
    assertThat(saved.getStatus()).isEqualTo(UserStatus.ACTIVE);
    verify(roleService).ensureDefaultRole(any(User.class));
  }

  @Test
  void registerRejectsInvalidPayload() throws Exception {
    String body = """
      {
        "userEmail": "not-an-email",
        "userPassword": "123",
        "userFullname": "",
        "userNickname": "ab"
      }
      """;

    mockMvc
      .perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"));
  }

  @Test
  void loginReturns401OnBadCredentials() throws Exception {
    when(authenticationManagerBuilder.getObject()).thenReturn(authenticationManager);
    when(authenticationManager.authenticate(any()))
      .thenThrow(new BadCredentialsException("Bad credentials"));

    String body = """
      {
        "username": "user@example.com",
        "password": "wrong"
      }
      """;

    mockMvc
      .perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
      .andExpect(status().isUnauthorized())
      .andExpect(jsonPath("$.statusCode").value(401))
      .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
  }

  @Test
  void loginIssuesAccessTokenWithTokenTypeAndExpandedRoles() throws Exception {
    User admin = new User();
    admin.setId(1L);
    admin.setUserEmail("admin@example.com");
    admin.setUserFullname("Admin");
    admin.setUserNickname("admin");
    admin.setStatus(UserStatus.ACTIVE);

    when(authenticationManagerBuilder.getObject()).thenReturn(authenticationManager);
    when(authenticationManager.authenticate(any()))
      .thenReturn(new UsernamePasswordAuthenticationToken("admin@example.com", null));
    when(userService.handleGetUserByUserNawm("admin@example.com")).thenReturn(admin);
    when(roleService.rolesOf(admin))
      .thenReturn(List.of(RoleCode.USER, RoleCode.MODERATOR, RoleCode.ADMIN));
    when(accountStatusService.effectiveStatus(admin)).thenReturn(UserStatus.ACTIVE);

    String body = """
      {
        "username": "admin@example.com",
        "password": "password123"
      }
      """;

    mockMvc
      .perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
      .andExpect(status().isOk())
      .andExpect(cookie().exists("refresh_token"))
      .andExpect(cookie().httpOnly("refresh_token", true))
      .andExpect(jsonPath("$.data.roles", containsInAnyOrder("USER", "MODERATOR", "ADMIN")))
      .andExpect(jsonPath("$.data.accessToken").isString());

    assertThat(admin.getIsOnline()).isTrue();
    verify(userService).updateUser(admin);
  }

  @Test
  void accessJwtDecoderRejectsRefreshTokensAndRefreshValidatorRejectsAccessTokens() {
    RestLogin restLogin = new RestLogin();
    RestLogin.UserLogin userLogin = new RestLogin.UserLogin(5L, "u@example.com", "User", null, "usr");
    restLogin.setUser(userLogin);

    String accessToken = securityUtils.createToken("u@example.com", userLogin, List.of("ADMIN"));
    String refreshToken = securityUtils.refreshToken("u@example.com", restLogin, List.of("ADMIN"));

    Jwt decodedAccess = accessJwtDecoder.decode(accessToken);
    assertThat(decodedAccess.getClaimAsString("token_type")).isEqualTo("access");
    assertThat(decodedAccess.getClaimAsStringList("roles"))
      .containsExactlyInAnyOrder("USER", "MODERATOR", "ADMIN");

    assertThatThrownBy(() -> accessJwtDecoder.decode(refreshToken))
      .isInstanceOf(JwtValidationException.class);

    Jwt decodedRefresh = securityUtils.checkValidRefreshToken(refreshToken);
    assertThat(decodedRefresh.getClaimAsString("token_type")).isEqualTo("refresh");

    assertThatThrownBy(() -> securityUtils.checkValidRefreshToken(accessToken))
      .isInstanceOf(JwtValidationException.class);
  }

  @Test
  void refreshIssuesNewTokensFromRefreshCookie() throws Exception {
    User user = new User();
    user.setId(5L);
    user.setUserEmail("u@example.com");
    user.setUserFullname("User");
    user.setUserNickname("usr");
    user.setStatus(UserStatus.ACTIVE);

    RestLogin login = new RestLogin();
    login.setUser(new RestLogin.UserLogin(5L, "u@example.com", "User", null, "usr"));
    String refresh = securityUtils.refreshToken("u@example.com", login, List.of("USER"));

    when(userService.handleGetUserByUserNawm("u@example.com")).thenReturn(user);
    when(userService.getUserByRefreshTokenAndUserEmail(refresh, "u@example.com")).thenReturn(user);
    when(roleService.rolesOf(user)).thenReturn(List.of(RoleCode.USER));
    when(accountStatusService.effectiveStatus(user)).thenReturn(UserStatus.ACTIVE);

    mockMvc
      .perform(get("/api/v1/auth/refresh").cookie(new Cookie("refresh_token", refresh)))
      .andExpect(status().isOk())
      .andExpect(cookie().exists("refresh_token"))
      .andExpect(jsonPath("$.data.accessToken").isString());
  }

  @Test
  void logoutMarksUserOfflineAndClearsRefreshToken() throws Exception {
    User user = new User();
    user.setId(7L);
    user.setUserEmail("u@example.com");
    user.setIsOnline(true);
    user.setRefreshToken("some-refresh-token");

    SecurityContextHolder.getContext().setAuthentication(
      new UsernamePasswordAuthenticationToken("u@example.com", null, List.of())
    );
    when(userService.handleGetUserByUserNawm("u@example.com")).thenReturn(user);

    mockMvc
      .perform(post("/api/v1/auth/logout"))
      .andExpect(status().isOk())
      .andExpect(cookie().maxAge("refresh_token", 0));

    assertThat(user.getIsOnline()).isFalse();
    assertThat(user.getRefreshToken()).isNull();
    verify(userService).updateUser(eq(user));
  }

  @Test
  void roleServiceExpandsHierarchy() {
    Role adminRole = new Role();
    adminRole.setCode(RoleCode.ADMIN);
    User admin = new User();
    admin.addRole(adminRole);

    RoleService realRoleService = new RoleService(mock(), mock());
    assertThat(realRoleService.rolesOf(admin))
      .containsExactly(RoleCode.USER, RoleCode.MODERATOR, RoleCode.ADMIN);
  }
}
