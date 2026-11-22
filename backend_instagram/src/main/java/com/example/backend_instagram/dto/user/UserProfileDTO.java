package com.example.backend_instagram.dto.user;

import com.example.backend_instagram.entity.User;
import com.example.backend_instagram.entity.UserStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserProfileDTO {

  private Long id;
  private String userNickname;
  private String userFullname;
  private String userImage;
  private String userBio;
  private String userGender;

  @JsonProperty("isOnline")
  private boolean isOnline;

  private UserStatus status;

  // Private fields only populated when caller requests their own profile
  private String userEmail;
  private String userPhone;
  private String userBday;

  public static UserProfileDTO from(User user, boolean includePrivateFields) {
    UserProfileDTO dto = new UserProfileDTO();
    dto.setId(user.getId());
    dto.setUserNickname(user.getUserNickname());
    dto.setUserFullname(user.getUserFullname());
    dto.setUserImage(user.getUserImage());
    dto.setUserBio(user.getUserBio());
    dto.setUserGender(user.getUserGender());
    dto.setOnline(user.getIsOnline());
    dto.setStatus(user.getStatus());
    if (includePrivateFields) {
      dto.setUserEmail(user.getUserEmail());
      dto.setUserPhone(user.getUserPhone());
      dto.setUserBday(user.getUserBday());
    }
    return dto;
  }
}
