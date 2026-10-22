package com.example.backend_instagram.dto.user;

import com.example.backend_instagram.entity.UserStatus;
import java.time.Instant;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
public class RestLogin {
  private String accessToken;
  private UserLogin user;
  private List<String> roles;
  private UserStatus status;
  private Instant suspendedUntil;

  @Getter
  @Setter
  @AllArgsConstructor
  @NoArgsConstructor
  public static class UserLogin {
    private Long id;
    private String email;
    private String name;
    private String avatar;
    private String nikName;
  }

  @Getter
  @Setter
  public static class UserGetAccout {
    private UserLogin user;
    private List<String> roles;
    private UserStatus status;
    private Instant suspendedUntil;
  }
}
