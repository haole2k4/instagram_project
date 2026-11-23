package com.example.backend_instagram.dto.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterDTO {

  @NotBlank(message = "Email is required")
  @Email(message = "Email is invalid")
  @Size(max = 255, message = "Email must not exceed 255 characters")
  private String userEmail;

  @NotBlank(message = "Fullname is required")
  @Size(min = 1, max = 100, message = "Fullname must be between 1 and 100 characters")
  private String userFullname;

  @NotBlank(message = "Password is required")
  @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
  private String userPassword;

  @NotBlank(message = "Nickname is required")
  @Size(min = 3, max = 30, message = "Nickname must be between 3 and 30 characters")
  private String userNickname;
}
