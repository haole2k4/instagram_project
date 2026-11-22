package com.example.backend_instagram.config;

import com.example.backend_instagram.dto.user.RestResponse;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
public class CustomAuthenticationEntryPoint implements AuthenticationEntryPoint {
  private final AuthenticationEntryPoint delegate = new BearerTokenAuthenticationEntryPoint();
  private final ObjectMapper mapper;

  public CustomAuthenticationEntryPoint(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  @Override
  public void commence(
    HttpServletRequest request,
    HttpServletResponse response,
    AuthenticationException authException
  ) throws IOException, ServletException {
    this.delegate.commence(request, response, authException);

    response.setContentType("application/json;charset=UTF-8");
    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

    RestResponse<Object> responseBody = new RestResponse<>();

    String errorMessage = Optional
      .ofNullable(authException.getCause())
      .map(Throwable::getMessage)
      .orElse(authException.getMessage());

    responseBody.setStatusCode(HttpServletResponse.SC_UNAUTHORIZED);
    responseBody.setError(errorMessage);
    responseBody.setMessage("Token không hợp lệ hoặc đã hết hạn");

    response.getWriter().write(mapper.writeValueAsString(responseBody));
  }
}
