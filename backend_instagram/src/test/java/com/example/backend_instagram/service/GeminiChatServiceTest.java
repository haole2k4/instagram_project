package com.example.backend_instagram.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.example.backend_instagram.utils.error.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.ObjectMapper;

class GeminiChatServiceTest {

  private static final String API_URL = "https://generativelanguage.example.test/v1beta/models/gemini:generateContent";
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void throwsServiceUnavailableWhenApiKeyMissing() {
    GeminiChatService service = new GeminiChatService(
      RestClient.builder(),
      objectMapper,
      "   ",
      API_URL
    );

    assertThatThrownBy(() -> service.getGeminiResponse("hello"))
      .isInstanceOf(ApiException.class)
      .satisfies(ex -> {
        ApiException apiEx = (ApiException) ex;
        assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(apiEx.getCode()).isEqualTo("AI_UNAVAILABLE");
      });
  }

  @Test
  void throwsBadRequestWhenPromptBlank() {
    GeminiChatService service = new GeminiChatService(
      RestClient.builder(),
      objectMapper,
      "test-key",
      API_URL
    );

    assertThatThrownBy(() -> service.getGeminiResponse("  "))
      .isInstanceOf(ApiException.class)
      .satisfies(ex -> {
        ApiException apiEx = (ApiException) ex;
        assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(apiEx.getCode()).isEqualTo("INVALID_PROMPT");
      });
  }

  @Test
  void returnsCandidateTextOnSuccess() {
    RestClient.Builder builder = RestClient.builder();
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    GeminiChatService service = new GeminiChatService(
      builder.build(),
      objectMapper,
      "secret-api-key",
      API_URL
    );

    String responseJson = """
      {"candidates":[{"content":{"parts":[{"text":"Xin chao!"}]}}]}
      """;
    server
      .expect(requestTo(API_URL))
      .andExpect(method(HttpMethod.POST))
      .andExpect(header("x-goog-api-key", "secret-api-key"))
      .andRespond(withSuccess(responseJson, MediaType.APPLICATION_JSON));

    String reply = service.getGeminiResponse("Say hi");
    assertThat(reply).isEqualTo("Xin chao!");
    server.verify();
  }

  @Test
  void doesNotExposeUpstreamBodyOnError() {
    RestClient.Builder builder = RestClient.builder();
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    GeminiChatService service = new GeminiChatService(
      builder.build(),
      objectMapper,
      "secret-api-key",
      API_URL
    );

    server
      .expect(requestTo(API_URL))
      .andRespond(withServerError().body("INTERNAL_SECRET_UPSTREAM_TRACE"));

    assertThatThrownBy(() -> service.getGeminiResponse("hello"))
      .isInstanceOf(ApiException.class)
      .satisfies(ex -> {
        ApiException apiEx = (ApiException) ex;
        assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(apiEx.getCode()).isEqualTo("AI_UPSTREAM_ERROR");
        assertThat(apiEx.getMessage()).doesNotContain("INTERNAL_SECRET_UPSTREAM_TRACE");
      });
  }

  @Test
  void throwsBadGatewayWhenCandidatesMissing() {
    RestClient.Builder builder = RestClient.builder();
    MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    GeminiChatService service = new GeminiChatService(
      builder.build(),
      objectMapper,
      "secret-api-key",
      API_URL
    );

    server
      .expect(requestTo(API_URL))
      .andRespond(withSuccess("{\"candidates\":[]}", MediaType.APPLICATION_JSON));

    assertThatThrownBy(() -> service.getGeminiResponse("hello"))
      .isInstanceOf(ApiException.class)
      .satisfies(ex -> {
        ApiException apiEx = (ApiException) ex;
        assertThat(apiEx.getStatus()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(apiEx.getCode()).isEqualTo("AI_INVALID_RESPONSE");
      });
  }
}
