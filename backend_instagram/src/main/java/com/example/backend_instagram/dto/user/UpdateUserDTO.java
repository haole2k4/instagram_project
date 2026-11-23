package com.example.backend_instagram.dto.user;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserDTO {

  private Long id;

  @Size(min = 2, max = 30, message = "Nickname must be between 2 and 30 characters")
  private String userNickname;

  @Size(min = 1, max = 100, message = "Fullname must be between 1 and 100 characters")
  private String userFullname;

  @Size(max = 500, message = "Bio must not exceed 500 characters")
  private String userBio;

  @Size(max = 20, message = "Phone must not exceed 20 characters")
  private String userPhone;

  private String userImage;

  @Size(max = 20, message = "Gender must not exceed 20 characters")
  private String userGender;

  @Size(max = 30, message = "Birthday must not exceed 30 characters")
  private String userBday;
}
