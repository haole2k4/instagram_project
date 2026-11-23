package com.example.backend_instagram.utils.error;

import com.example.backend_instagram.dto.user.RestResponse;
import jakarta.persistence.NoResultException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class GlobalException {

  private static final Logger logger = LoggerFactory.getLogger(GlobalException.class);

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<RestResponse<Object>> handleApiException(ApiException e) {
    return buildError(e.getStatus().value(), e.getCode(), e.getMessage());
  }

  @ExceptionHandler({ UsernameNotFoundException.class, BadCredentialsException.class })
  public ResponseEntity<RestResponse<Object>> handleAuthFailure(Exception e) {
    return buildError(
      HttpStatus.UNAUTHORIZED.value(),
      "UNAUTHORIZED",
      "Email hoặc mật khẩu không đúng"
    );
  }

  @ExceptionHandler(IdInvalidException.class)
  public ResponseEntity<RestResponse<Object>> handleIdException(IdInvalidException e) {
    return buildError(
      HttpStatus.BAD_REQUEST.value(),
      "BAD_REQUEST",
      e.getMessage()
    );
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<RestResponse<Object>> handleAccessDenied(AccessDeniedException e) {
    return buildError(
      HttpStatus.FORBIDDEN.value(),
      "FORBIDDEN",
      "Bạn không có quyền thực hiện hành động này."
    );
  }

  @ExceptionHandler(NoResultException.class)
  public ResponseEntity<RestResponse<Object>> handleNotFoundException(NoResultException ex) {
    return buildError(
      HttpStatus.NOT_FOUND.value(),
      "NOT_FOUND",
      "404 Not Found. URL may not exist..."
    );
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  public ResponseEntity<RestResponse<Object>> handleMaxUploadSize(MaxUploadSizeExceededException e) {
    return buildError(
      413,
      "PAYLOAD_TOO_LARGE",
      "Kích thước tệp tải lên vượt quá giới hạn cho phép."
    );
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<RestResponse<Object>> handleBadRequest(IllegalArgumentException e) {
    return buildError(
      HttpStatus.BAD_REQUEST.value(),
      "VALIDATION_ERROR",
      e.getMessage()
    );
  }

  @ExceptionHandler({
    IllegalStateException.class,
    DataIntegrityViolationException.class,
    OptimisticLockingFailureException.class,
  })
  public ResponseEntity<RestResponse<Object>> handleConflict(Exception e) {
    String message = e instanceof IllegalStateException
      ? e.getMessage()
      : "Dữ liệu bị xung đột hoặc vi phạm ràng buộc.";
    return buildError(HttpStatus.CONFLICT.value(), "CONFLICT", message);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<RestResponse<Object>> handleUnreadable(HttpMessageNotReadableException e) {
    return buildError(
      HttpStatus.BAD_REQUEST.value(),
      "VALIDATION_ERROR",
      "Dữ liệu gửi lên không hợp lệ."
    );
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<RestResponse<Object>> validationError(
    MethodArgumentNotValidException e
  ) {
    BindingResult result = e.getBindingResult();
    List<FieldError> fieldErrors = result.getFieldErrors();

    List<String> errors = fieldErrors
      .stream()
      .map(FieldError::getDefaultMessage)
      .toList();

    String message = errors.isEmpty()
      ? "Invalid request"
      : (errors.size() > 1 ? errors.toString() : errors.get(0));

    return buildError(HttpStatus.BAD_REQUEST.value(), "VALIDATION_ERROR", message);
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<RestResponse<Object>> handleUnexpected(Exception e) {
    if (e instanceof ErrorResponse errorResponse) {
      int status = errorResponse.getStatusCode().value();
      return buildError(status, "REQUEST_ERROR", errorResponse.getBody().getDetail());
    }
    logger.error("Unhandled exception", e);
    return buildError(
      HttpStatus.INTERNAL_SERVER_ERROR.value(),
      "INTERNAL_ERROR",
      "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau."
    );
  }

  private ResponseEntity<RestResponse<Object>> buildError(
    int statusCode,
    String error,
    String message
  ) {
    RestResponse<Object> res = new RestResponse<>();
    res.setStatusCode(statusCode);
    res.setError(error);
    res.setMessage(message);
    return ResponseEntity.status(statusCode).body(res);
  }
}
