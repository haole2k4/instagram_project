package com.example.backend_instagram.admin;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.backend_instagram.config.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@AutoConfigureMockMvc
class AdminSecurityIntegrationTest extends TestcontainersConfiguration {

  @Autowired
  private MockMvc mockMvc;

  @Test
  void userCannotOpenDashboard() throws Exception {
    mockMvc
      .perform(get("/api/v1/admin/stats/overview").with(user("user").roles("USER")))
      .andExpect(status().isForbidden());
  }

  @Test
  void moderatorCanOpenDashboard() throws Exception {
    mockMvc
      .perform(get("/api/v1/admin/stats/overview").with(user("mod").roles("MODERATOR")))
      .andExpect(status().isOk());
  }

  @Test
  void moderatorCannotReadAuditLog() throws Exception {
    mockMvc
      .perform(get("/api/v1/admin/audit-logs").with(user("mod").roles("MODERATOR")))
      .andExpect(status().isForbidden());
  }

  @Test
  void adminCanReadAuditLog() throws Exception {
    mockMvc
      .perform(get("/api/v1/admin/audit-logs").with(user("admin").roles("ADMIN")))
      .andExpect(status().isOk());
  }

  @Test
  void moderatorCannotBan() throws Exception {
    mockMvc
      .perform(
        post("/api/v1/admin/users/999999/ban")
          .with(user("mod").roles("MODERATOR"))
          .contentType("application/json")
          .content("{\"reasonCode\":\"SPAM\",\"note\":\"test\"}")
      )
      .andExpect(status().isForbidden());
  }

  @Test
  void moderatorCanListUsersReportsAndContent() throws Exception {
    mockMvc
      .perform(get("/api/v1/admin/users").with(user("mod").roles("MODERATOR")))
      .andExpect(status().isOk());
    mockMvc
      .perform(get("/api/v1/admin/reports").with(user("mod").roles("MODERATOR")))
      .andExpect(status().isOk());
    mockMvc
      .perform(get("/api/v1/admin/content").with(user("mod").roles("MODERATOR")))
      .andExpect(status().isOk());
  }
}
