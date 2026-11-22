package com.example.backend_instagram.utils;

import com.example.backend_instagram.dto.user.RestResponse;
import com.example.backend_instagram.utils.constant.ApiMessage;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@RestControllerAdvice
public class FormatRestresponse implements ResponseBodyAdvice<Object> {

  @Override
  public boolean supports(
    MethodParameter returnType,
    Class<? extends HttpMessageConverter<?>> converterType
  ) {
    if (RestResponse.class.isAssignableFrom(returnType.getParameterType())) {
      return false;
    }
    String packageName = returnType.getContainingClass().getPackageName();
    return !packageName.startsWith("org.springframework.boot.actuate");
  }

  @Override
  public Object beforeBodyWrite(
    Object body,
    MethodParameter returnType,
    MediaType selectedContentType,
    Class<? extends HttpMessageConverter<?>> selectedConverterType,
    ServerHttpRequest request,
    ServerHttpResponse response
  ) {
    if (body instanceof String || body instanceof RestResponse<?>) {
      return body;
    }
    String path = request.getURI().getPath();
    if (path != null && path.startsWith("/actuator")) {
      return body;
    }

    HttpServletResponse servletResponse =
      ((ServletServerHttpResponse) response).getServletResponse();
    int status = servletResponse.getStatus();

    if (status >= 400) {
      return body;
    }

    RestResponse<Object> res = new RestResponse<>();
    res.setStatusCode(status);
    res.setData(body);
    ApiMessage message = returnType.getMethodAnnotation(ApiMessage.class);
    res.setMessage(message != null ? message.value() : "CALL API SUCCESS");
    return res;
  }
}
