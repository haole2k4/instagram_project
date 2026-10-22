package com.example.backend_instagram.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable = false, unique = true)
  private String userNickname;
  @Column(nullable = false)
  private String userFullname;
  private String userBday;
  private String userEmail;
  @JsonIgnore
  private String userPassword;
  private String userPhone;
  private String userImage;
  private String userGender;
  private String userBio;
  @Column(nullable = false)
  private boolean isOnline;
  private String socketId;
  @JsonIgnore
  @Column(columnDefinition = "MEDIUMTEXT")
  private String refreshToken;
  @Column(name = "created_at")
  private LocalDateTime createdAt;
  private Instant updatedAt;
  private String createdBy;
  private String updatedBy;

  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private UserStatus status = UserStatus.ACTIVE;
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  private Instant suspendedUntil;
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  @Enumerated(EnumType.STRING)
  private ReasonCode statusReasonCode;
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  @Column(length = 500)
  private String statusReason;
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  private Instant statusChangedAt;
  @JsonProperty(access = JsonProperty.Access.READ_ONLY)
  private Long statusChangedBy;

  @JsonIgnore
  @ManyToMany(fetch = FetchType.EAGER)
  @JoinTable(
    name = "user_roles",
    joinColumns = @JoinColumn(name = "user_id"),
    inverseJoinColumns = @JoinColumn(name = "role_id")
  )
  private Set<Role> roles = new HashSet<>();

  @PrePersist
  protected void onCreate() {
    createdAt = LocalDateTime.now();
    if (status == null) {
      status = UserStatus.ACTIVE;
    }
  }

  // Bidirectional relationships for performance optimization
  @jakarta.persistence.OneToMany(mappedBy = "user", fetch = jakarta.persistence.FetchType.LAZY)
  @com.fasterxml.jackson.annotation.JsonIgnore
  private java.util.List<com.example.backend_instagram.entity.Post> posts;

  @jakarta.persistence.OneToMany(mappedBy = "user", fetch = jakarta.persistence.FetchType.LAZY)
  @com.fasterxml.jackson.annotation.JsonIgnore
  private java.util.List<com.example.backend_instagram.entity.Comment> comments;

  public void setIsOnline(boolean isOnline) {
    this.isOnline = isOnline;
  }

  public boolean getIsOnline() {
    return this.isOnline;
  }

  public boolean hasRole(RoleCode code) {
    return roles != null && roles.stream().anyMatch(role -> role.getCode() == code);
  }

  public void addRole(Role role) {
    if (roles == null) {
      roles = new HashSet<>();
    }
    roles.add(role);
  }
}
