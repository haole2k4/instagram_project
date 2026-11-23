package com.example.backend_instagram.utils;

import com.example.backend_instagram.dto.user.RestLogin;
import com.example.backend_instagram.entity.RoleCode;
import com.example.backend_instagram.service.RoleService;
import com.nimbusds.jose.util.Base64;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

@Service
public class SecurityUtils {

  public static final org.springframework.security.oauth2.jose.jws.MacAlgorithm JWT_ALGORITHM =
    org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS512;

  private final JwtEncoder jwtEncoder;
  private volatile JwtDecoder refreshJwtDecoder;

  @Value("${tenit.jwt.base64-secret}")
  private String jwtKey;

  @Value("${tenit.jwt.token-validity-in-seconds}")
  private long jwtKeyExpiration;

  @Value("${tenit.jwt.refresh-token-validity-in-seconds}")
  private long refreshToken;

  @Autowired
  public SecurityUtils(JwtEncoder jwtEncoder) {
    this.jwtEncoder = jwtEncoder;
  }

  SecurityUtils(JwtEncoder jwtEncoder, JwtDecoder refreshJwtDecoder) {
    this.jwtEncoder = jwtEncoder;
    this.refreshJwtDecoder = refreshJwtDecoder;
  }

  public String createToken(
    String email,
    RestLogin.UserLogin restLogin,
    List<String> roles
  ) {
    Instant now = Instant.now();
    Instant validity = now.plus(jwtKeyExpiration, ChronoUnit.SECONDS);

    JwtClaimsSet claims = JwtClaimsSet
      .builder()
      .issuedAt(now)
      .expiresAt(validity)
      .subject(email)
      .claim("token_type", "access")
      .claim("user", restLogin)
      .claim("userId", restLogin != null ? restLogin.getId() : null)
      .claim("roles", normalizeRoles(roles))
      .build();

    return jwtEncoder
      .encode(JwtEncoderParameters.from(JwsHeader.with(() -> "HS512").build(), claims))
      .getTokenValue();
  }

  public String refreshToken(
    String email,
    RestLogin restLogin,
    List<String> roles
  ) {
    Instant now = Instant.now();
    Instant validity = now.plus(refreshToken, ChronoUnit.SECONDS);
    JwtClaimsSet claims = JwtClaimsSet
      .builder()
      .issuedAt(now)
      .expiresAt(validity)
      .subject(email)
      .claim("token_type", "refresh")
      .claim("user", restLogin.getUser())
      .claim("userId", restLogin.getUser() != null ? restLogin.getUser().getId() : null)
      .claim("roles", normalizeRoles(roles))
      .build();
    return jwtEncoder
      .encode(JwtEncoderParameters.from(JwsHeader.with(() -> "HS512").build(), claims))
      .getTokenValue();
  }

  private List<String> normalizeRoles(List<String> roles) {
    List<RoleCode> parsed = new ArrayList<>();
    if (roles != null) {
      for (String role : roles) {
        if (role == null || role.isBlank()) {
          continue;
        }
        String normalized = role.startsWith("ROLE_") ? role.substring("ROLE_".length()) : role;
        try {
          parsed.add(RoleCode.valueOf(normalized));
        } catch (IllegalArgumentException ignored) {
          // Ignore unknown roles
        }
      }
    }
    return RoleService.expandRoles(parsed).stream().map(Enum::name).toList();
  }

  public static Optional<String> getCurrentUserLogin() {
    SecurityContext securityContext = SecurityContextHolder.getContext();
    return Optional.ofNullable(
      extractPrincipal(securityContext.getAuthentication())
    );
  }

  private static String extractPrincipal(Authentication authentication) {
    if (authentication == null) {
      return null;
    } else if (
      authentication.getPrincipal() instanceof UserDetails springSecurityUser
    ) {
      return springSecurityUser.getUsername();
    } else if (
      authentication.getPrincipal() instanceof Jwt jwt
    ) {
      return jwt.getSubject();
    } else if (authentication.getPrincipal() instanceof String s) {
      return s;
    }
    return null;
  }

  public static boolean hasRole(String role) {
    Authentication authentication = SecurityContextHolder
      .getContext()
      .getAuthentication();
    if (authentication == null) {
      return false;
    }
    String normalized = role.startsWith("ROLE_") ? role.substring("ROLE_".length()) : role;
    Set<String> authorities = authentication
      .getAuthorities()
      .stream()
      .map(GrantedAuthority::getAuthority)
      .collect(java.util.stream.Collectors.toSet());

    if (authorities.contains("ROLE_" + normalized)) {
      return true;
    }
    if ("USER".equals(normalized)) {
      return authorities.contains("ROLE_MODERATOR") || authorities.contains("ROLE_ADMIN");
    }
    if ("MODERATOR".equals(normalized)) {
      return authorities.contains("ROLE_ADMIN");
    }
    return false;
  }

  /**
   * Lấy userId từ JWT claim. Dùng cho cả REST và STOMP để không tin userId
   * do client gửi lên.
   */
  public static Optional<Long> getCurrentUserId() {
    Authentication authentication = SecurityContextHolder
      .getContext()
      .getAuthentication();
    if (authentication == null) {
      return Optional.empty();
    }
    if (authentication.getPrincipal() instanceof Jwt jwt) {
      Long userId = toLong(jwt.getClaim("userId"));
      if (userId != null) {
        return Optional.of(userId);
      }
      Map<String, Object> userClaim = jwt.getClaimAsMap("user");
      if (userClaim != null) {
        return Optional.ofNullable(toLong(userClaim.get("id")));
      }
    }
    return Optional.empty();
  }

  private static Long toLong(Object value) {
    if (value instanceof Number number) {
      return number.longValue();
    }
    if (value instanceof String text && !text.isBlank()) {
      try {
        return Long.valueOf(text);
      } catch (NumberFormatException ignored) {
        return null;
      }
    }
    return null;
  }

  public static Optional<String> getCurrentUserJWT() {
    SecurityContext securityContext = SecurityContextHolder.getContext();
    return Optional
      .ofNullable(securityContext.getAuthentication())
      .filter(authentication ->
        authentication.getCredentials() instanceof String
      )
      .map(authentication -> (String) authentication.getCredentials());
  }

  private SecretKey getSecretKey() {
    byte[] keyBytes = Base64.from(jwtKey).decode();
    return new SecretKeySpec(
      keyBytes,
      0,
      keyBytes.length,
      SecurityUtils.JWT_ALGORITHM.getName()
    );
  }

  private JwtDecoder getOrCreateRefreshJwtDecoder() {
    JwtDecoder decoder = this.refreshJwtDecoder;
    if (decoder != null) {
      return decoder;
    }
    synchronized (this) {
      if (this.refreshJwtDecoder == null) {
        NimbusJwtDecoder nimbus = NimbusJwtDecoder
          .withSecretKey(getSecretKey())
          .macAlgorithm(SecurityUtils.JWT_ALGORITHM)
          .build();
        OAuth2TokenValidator<Jwt> refreshTokenTypeValidator = jwt -> {
          if ("refresh".equals(jwt.getClaimAsString("token_type"))) {
            return OAuth2TokenValidatorResult.success();
          }
          return OAuth2TokenValidatorResult.failure(
            new OAuth2Error("invalid_token", "Refresh token required", null)
          );
        };
        nimbus.setJwtValidator(
          new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefault(),
            refreshTokenTypeValidator
          )
        );
        this.refreshJwtDecoder = nimbus;
      }
      return this.refreshJwtDecoder;
    }
  }

  public Jwt checkValidRefreshToken(String token) {
    Jwt jwt = getOrCreateRefreshJwtDecoder().decode(token);
    if (!"refresh".equals(jwt.getClaimAsString("token_type"))) {
      throw new BadJwtException("Invalid token_type claim for refresh token");
    }
    return jwt;
  }
}
