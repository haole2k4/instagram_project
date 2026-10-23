package com.example.backend_instagram.config;

import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.entity.UserStatus;
import com.example.backend_instagram.repository.UserRepository;
import com.example.backend_instagram.service.AccountStatusService;
import com.example.backend_instagram.utils.SecurityUntil;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AccountRestrictionInterceptor implements HandlerInterceptor {
  private final UserRepository userRepository;
  private final AccountStatusService accountStatusService;
  private final ObjectMapper objectMapper = new ObjectMapper();

  public AccountRestrictionInterceptor(
    UserRepository userRepository,
    AccountStatusService accountStatusService
  ) {
    this.userRepository = userRepository;
    this.accountStatusService = accountStatusService;
  }

  @Override
  public boolean preHandle(
    HttpServletRequest request,
    HttpServletResponse response,
    Object handler
  ) throws Exception {
    String method = request.getMethod();
    if ("GET".equals(method) || "HEAD".equals(method) || "OPTIONS".equals(method)) {
      return true;
    }
    String path = request.getRequestURI();
    if (path.startsWith("/api/v1/auth/")) {
      return true;
    }

    User user = currentUser();
    if (user == null || !accountStatusService.isRestricted(user)) {
      return true;
    }

    UserStatus status = accountStatusService.effectiveStatus(user);
    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
    response.setContentType("application/json;charset=UTF-8");
    objectMapper.writeValue(
      response.getWriter(),
      Map.of(
        "statusCode",
        403,
        "error",
        "ACCOUNT_RESTRICTED",
        "message",
        "Tài khoản đang bị hạn chế. Không thể thực hiện hành động này.",
        "data",
        Map.of(
          "status",
          status.name(),
          "suspendedUntil",
          user.getSuspendedUntil() == null ? "" : user.getSuspendedUntil().toString()
        )
      )
    );
    return false;
  }

  private User currentUser() {
    Long id = SecurityUntil.getCurrentUserId().orElse(null);
    if (id != null) {
      return userRepository.findById(id).orElse(null);
    }
    String email = SecurityUntil.getCurrentUserLogin().orElse(null);
    if (email == null || email.isBlank()) {
      return null;
    }
    return userRepository.findByUserEmail(email);
  }
}
