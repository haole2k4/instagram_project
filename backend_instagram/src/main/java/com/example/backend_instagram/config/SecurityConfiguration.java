package com.example.backend_instagram.config;

import com.example.backend_instagram.entity.RoleCode;
import com.example.backend_instagram.service.RoleService;
import com.example.backend_instagram.utils.SecurityUtils;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.nimbusds.jose.util.Base64;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfiguration {

  @Value("${tenit.jwt.base64-secret}")
  private String jwtKey;

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public AuthenticationManager authenticationManager(
    UserDetailsService userDetailsService,
    PasswordEncoder passwordEncoder
  ) {
    DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
    provider.setPasswordEncoder(passwordEncoder);
    return new ProviderManager(provider);
  }

  @Bean
  public SecurityFilterChain filterChain(
    HttpSecurity http,
    CustomAuthenticationEntryPoint caep
  ) throws Exception {
    http
      .csrf(c -> c.disable())
      .cors(Customizer.withDefaults())
      .authorizeHttpRequests(authz ->
        authz
          .requestMatchers(
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh",
            "/actuator/health/**",
            "/ws/**",
            "/ws-native/**"
          )
          .permitAll()
          .requestMatchers("/api/v1/admin/**")
          .hasAnyRole("MODERATOR", "ADMIN")
          .anyRequest()
          .authenticated()
      )
      .sessionManagement(session ->
        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
      )
      .exceptionHandling(exceptions ->
        exceptions
          .authenticationEntryPoint(new BearerTokenAuthenticationEntryPoint())
          .accessDeniedHandler(new BearerTokenAccessDeniedHandler())
      )
      .oauth2ResourceServer(oauth2 ->
        oauth2
          .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
          .authenticationEntryPoint(caep)
      )
      .formLogin(f -> f.disable());

    return http.build();
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

  @Bean
  public JwtEncoder jwtEncoder() {
    return new NimbusJwtEncoder(new ImmutableSecret<>(getSecretKey()));
  }

  @Bean
  public JwtDecoder jwtDecoder() {
    NimbusJwtDecoder jwtDecoder = NimbusJwtDecoder
      .withSecretKey(getSecretKey())
      .macAlgorithm(SecurityUtils.JWT_ALGORITHM)
      .build();

    OAuth2TokenValidator<Jwt> accessTokenTypeValidator = jwt -> {
      String tokenType = jwt.getClaimAsString("token_type");
      if ("access".equals(tokenType)) {
        return OAuth2TokenValidatorResult.success();
      }
      return OAuth2TokenValidatorResult.failure(
        new OAuth2Error("invalid_token", "Access token required", null)
      );
    };

    jwtDecoder.setJwtValidator(
      new DelegatingOAuth2TokenValidator<>(
        JwtValidators.createDefault(),
        accessTokenTypeValidator
      )
    );
    return jwtDecoder;
  }

  private JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter baseConverter = new JwtGrantedAuthoritiesConverter();
    baseConverter.setAuthorityPrefix("ROLE_");
    baseConverter.setAuthoritiesClaimName("roles");

    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(jwt -> {
      Collection<GrantedAuthority> rawAuthorities = baseConverter.convert(jwt);
      List<RoleCode> rawCodes = new ArrayList<>();
      if (rawAuthorities != null) {
        for (GrantedAuthority authority : rawAuthorities) {
          String name = authority.getAuthority();
          if (name != null && name.startsWith("ROLE_")) {
            try {
              rawCodes.add(RoleCode.valueOf(name.substring("ROLE_".length())));
            } catch (IllegalArgumentException ignored) {
              // Ignore unknown role names
            }
          }
        }
      }
      return RoleService
        .expandRoles(rawCodes)
        .stream()
        .<GrantedAuthority>map(code -> new SimpleGrantedAuthority("ROLE_" + code.name()))
        .toList();
    });
    return converter;
  }
}
