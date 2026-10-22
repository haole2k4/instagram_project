package com.example.backend_instagram.controller;

import com.example.backend_instagram.dto.user.LoginDTO;
import com.example.backend_instagram.dto.user.ResCreateUserDTO;
import com.example.backend_instagram.dto.user.RestLogin;
import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.entity.UserStatus;
import com.example.backend_instagram.service.AccountStatusService;
import com.example.backend_instagram.service.RoleService;
import com.example.backend_instagram.service.UserService;
import com.example.backend_instagram.utils.SecurityUntil;
import com.example.backend_instagram.utils.constant.ApiMessage;
import com.example.backend_instagram.utils.error.IdInvalidException;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AuthController {

  private final AuthenticationManagerBuilder authenticationManagerBuilder;
  private final SecurityUntil securityUntil;
  private final UserService userService;
  private final PasswordEncoder passwordEncoder;
  private final RoleService roleService;
  private final AccountStatusService accountStatusService;

  @Value("${app.auth-cookie-secure:false}")
  private boolean authCookieSecure;
  @Value("${app.auth-cookie-same-site:Lax}")
  private String authCookieSameSite;
  @Value("${tenit.jwt.refresh-token-validity-in-seconds:604800}")
  private long refreshCookieMaxAge;

  public AuthController(
    AuthenticationManagerBuilder authenticationManagerBuilder,
    SecurityUntil securityUntil,
    UserService userService,
    PasswordEncoder passwordEncoder,
    RoleService roleService,
    AccountStatusService accountStatusService
  ) {
    this.authenticationManagerBuilder = authenticationManagerBuilder;
    this.securityUntil = securityUntil;
    this.userService = userService;
    this.passwordEncoder = passwordEncoder;
    this.roleService = roleService;
    this.accountStatusService = accountStatusService;
  }

  @PostMapping("/auth/login")
  public ResponseEntity<RestLogin> login(@Valid @RequestBody LoginDTO loginDTO)
    throws IdInvalidException {
    User currentuserDb = this.userService.handleGetUserByUserNawm(loginDTO.getUsername());

    if (currentuserDb == null) {
      throw new IdInvalidException("Người dùng không tồn tại trong hệ thống");
    }

    if (!passwordEncoder.matches(loginDTO.getPassword(), currentuserDb.getUserPassword())) {
      throw new IdInvalidException("Mật khẩu người dùng không đúng");
    }

    UsernamePasswordAuthenticationToken authenticationToken =
      new UsernamePasswordAuthenticationToken(
        loginDTO.getUsername(),
        loginDTO.getPassword()
      );
    Authentication authentication = authenticationManagerBuilder
      .getObject()
      .authenticate(authenticationToken);
    SecurityContextHolder.getContext().setAuthentication(authentication);

    currentuserDb.setIsOnline(true);
    userService.updateUser(currentuserDb);

    RestLogin restLogin = buildRestLogin(currentuserDb);
    List<String> roles = roleService.rolesOf(currentuserDb).stream().map(Enum::name).toList();
    restLogin.setRoles(roles);
    restLogin.setStatus(accountStatusService.effectiveStatus(currentuserDb));
    restLogin.setSuspendedUntil(currentuserDb.getSuspendedUntil());

    restLogin.setAccessToken(
      this.securityUntil.createToken(authentication.getName(), restLogin.getUser(), roles)
    );
    String refreshToken = this.securityUntil.refreshToken(
      loginDTO.getUsername(),
      restLogin,
      roles
    );
    this.userService.updateUserToken(refreshToken, loginDTO.getUsername());

    return ResponseEntity
      .ok()
      .header(
        org.springframework.http.HttpHeaders.SET_COOKIE,
        refreshCookie(refreshToken, Duration.ofSeconds(refreshCookieMaxAge)).toString()
      )
      .body(restLogin);
  }

  @GetMapping("/auth/account")
  @ApiMessage("fetch account")
  public ResponseEntity<RestLogin.UserGetAccout> getAccount() {
    String email = SecurityUntil.getCurrentUserLogin().orElse("");
    User currentuserDb = this.userService.handleGetUserByUserNawm(email);
    RestLogin.UserGetAccout result = new RestLogin.UserGetAccout();
    if (currentuserDb != null) {
      RestLogin.UserLogin userLogin = toUserLogin(currentuserDb);
      result.setUser(userLogin);
      result.setRoles(roleService.rolesOf(currentuserDb).stream().map(Enum::name).toList());
      result.setStatus(accountStatusService.effectiveStatus(currentuserDb));
      result.setSuspendedUntil(currentuserDb.getSuspendedUntil());
    }
    return ResponseEntity.ok().body(result);
  }

  @GetMapping("/auth/refresh")
  @ApiMessage("Get user by refesh token")
  public ResponseEntity<RestLogin> getRefreshLogin(
    @CookieValue(name = "refresh_token") String refreshToken
  ) throws IdInvalidException {
    org.springframework.security.oauth2.jwt.Jwt decoded =
      this.securityUntil.checkValidRefreshToken(refreshToken);
    String email = decoded.getSubject();

    User currentuserDb = this.userService.handleGetUserByUserNawm(email);
    if (currentuserDb == null) {
      throw new IdInvalidException("Người dùng không tồn tại");
    }
    User currentUser = this.userService.getUserByRefreshTokenAndUserEmail(refreshToken, email);
    if (currentUser == null) {
      throw new IdInvalidException("refresh token ko hợp lệ");
    }

    RestLogin restLogin = buildRestLogin(currentuserDb);
    List<String> roles = roleService.rolesOf(currentuserDb).stream().map(Enum::name).toList();
    restLogin.setRoles(roles);
    restLogin.setStatus(accountStatusService.effectiveStatus(currentuserDb));
    restLogin.setSuspendedUntil(currentuserDb.getSuspendedUntil());
    restLogin.setAccessToken(this.securityUntil.createToken(email, restLogin.getUser(), roles));

    String newRefreshToken = this.securityUntil.refreshToken(email, restLogin, roles);
    this.userService.updateUserToken(newRefreshToken, email);

    return ResponseEntity
      .ok()
      .header(
        org.springframework.http.HttpHeaders.SET_COOKIE,
        refreshCookie(newRefreshToken, Duration.ofSeconds(refreshCookieMaxAge)).toString()
      )
      .body(restLogin);
  }

  @PostMapping("/auth/logout")
  @ApiMessage("loout User")
  public ResponseEntity<Void> logout() throws IdInvalidException {
    String email = SecurityUntil.getCurrentUserLogin().orElse("");
    if (email.isBlank()) {
      throw new IdInvalidException("Access Token khong hop le");
    }
    this.userService.updateUserToken(null, email);
    return ResponseEntity
      .ok()
      .header(
        org.springframework.http.HttpHeaders.SET_COOKIE,
        refreshCookie("", Duration.ZERO).toString()
      )
      .body(null);
  }

  @PostMapping("/auth/register")
  @ApiMessage("User Register")
  public ResponseEntity<ResCreateUserDTO> userRegister(
    @Valid @RequestBody User bodyUser
  ) throws IdInvalidException {
    User currentDb = this.userService.handleGetUserByUserNawm(bodyUser.getUserEmail());
    if (currentDb != null) {
      throw new IdInvalidException("Người dùng đã tồn tại trong hệ thống");
    }
    if (this.userService.isNikNameExsit(bodyUser.getUserNickname())) {
      throw new IdInvalidException("Nickname đã tồn tại. Vui lòng chọn nickname khác!");
    }

    bodyUser.setId(null);
    bodyUser.setUserPassword(passwordEncoder.encode(bodyUser.getUserPassword()));
    bodyUser.setStatus(UserStatus.ACTIVE);
    bodyUser.setSuspendedUntil(null);
    bodyUser.setStatusReason(null);
    bodyUser.setStatusReasonCode(null);
    bodyUser.setRoles(new java.util.HashSet<>());
    this.roleService.ensureDefaultRole(bodyUser);

    User saved = this.userService.createUser(bodyUser);
    return ResponseEntity
      .status(HttpStatus.CREATED)
      .body(this.userService.convertToResCreateUserDTO(saved));
  }

  private RestLogin buildRestLogin(User user) {
    RestLogin restLogin = new RestLogin();
    restLogin.setUser(toUserLogin(user));
    return restLogin;
  }

  private RestLogin.UserLogin toUserLogin(User user) {
    return new RestLogin.UserLogin(
      user.getId(),
      user.getUserEmail(),
      user.getUserFullname(),
      user.getUserImage(),
      user.getUserNickname()
    );
  }

  private ResponseCookie refreshCookie(String value, Duration maxAge) {
    return ResponseCookie
      .from("refresh_token", value)
      .httpOnly(true)
      .secure(authCookieSecure)
      .sameSite(authCookieSameSite)
      .path("/")
      .maxAge(maxAge)
      .build();
  }
}
