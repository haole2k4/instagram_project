package com.example.backend_instagram.utils.error;

import com.example.backend_instagram.dto.user.RestResponse;
import jakarta.persistence.NoResultException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalException {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<RestResponse<Object>> handleApiException(ApiException e) {
    RestResponse<Object> res = new RestResponse<>();
    res.setStatusCode(e.getStatus().value());
    res.setError(e.getCode());
    res.setMessage(e.getMessage());
    return ResponseEntity.status(e.getStatus()).body(res);
  }

  @ExceptionHandler(
    value = {
      UsernameNotFoundException.class,
      BadCredentialsException.class,
      IdInvalidException.class,
    }
  )
  public ResponseEntity<RestResponse<Object>> handleIdException(Exception e) {
    RestResponse<Object> res = new RestResponse<>();
    res.setStatusCode(HttpStatus.BAD_REQUEST.value());
    res.setError(e.getMessage());
    res.setMessage("An error occurred during the API call.");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(res);
  }

  @ExceptionHandler(value = { NoResultException.class })
  public ResponseEntity<RestResponse<Object>> handleNotFoundException(Exception ex) {
    RestResponse<Object> res = new RestResponse<>();
    res.setStatusCode(HttpStatus.NOT_FOUND.value());
    res.setError(ex.getMessage());
    res.setMessage("404 Not Found. URL may not exist...");
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(res);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<RestResponse<Object>> handleBadRequest(IllegalArgumentException e) {
    RestResponse<Object> res = new RestResponse<>();
    res.setStatusCode(HttpStatus.BAD_REQUEST.value());
    res.setError("VALIDATION_ERROR");
    res.setMessage(e.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(res);
  }

  @ExceptionHandler(IllegalStateException.class)
  public ResponseEntity<RestResponse<Object>> handleConflict(IllegalStateException e) {
    RestResponse<Object> res = new RestResponse<>();
    res.setStatusCode(HttpStatus.CONFLICT.value());
    res.setError("CONFLICT");
    res.setMessage(e.getMessage());
    return ResponseEntity.status(HttpStatus.CONFLICT).body(res);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<RestResponse<Object>> handleUnreadable(HttpMessageNotReadableException e) {
    RestResponse<Object> res = new RestResponse<>();
    res.setStatusCode(HttpStatus.BAD_REQUEST.value());
    res.setError("VALIDATION_ERROR");
    res.setMessage("Dữ liệu gửi lên không hợp lệ.");
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(res);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<RestResponse<Object>> validationError(
    MethodArgumentNotValidException e
  ) {
    BindingResult result = e.getBindingResult();
    List<FieldError> fieldErrors = result.getFieldErrors();

    RestResponse<Object> res = new RestResponse<>();
    res.setStatusCode(HttpStatus.BAD_REQUEST.value());
    res.setError("VALIDATION_ERROR");

    List<String> errors = fieldErrors
      .stream()
      .map(FieldError::getDefaultMessage)
      .toList();

    if (!errors.isEmpty()) {
      res.setMessage(errors.size() > 1 ? errors.toString() : errors.get(0));
    } else {
      res.setMessage("Invalid request");
    }

    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(res);
  }
}
