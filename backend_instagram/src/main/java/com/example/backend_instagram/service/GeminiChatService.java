package com.example.backend_instagram.service;

import com.example.backend_instagram.utils.error.ApiException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Service
public class GeminiChatService {

  private static final Logger logger = LoggerFactory.getLogger(GeminiChatService.class);

  private final RestClient restClient;
  private final ObjectMapper objectMapper;
  private final String apiKey;
  private final String apiUrl;

  @Autowired
  public GeminiChatService(
    ObjectProvider<RestClient.Builder> restClientBuilderProvider,
    ObjectMapper objectMapper,
    @Value("${gemini.api.key:}") String apiKey,
    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent}") String apiUrl
  ) {
    this(
      buildRestClient(restClientBuilderProvider.getIfAvailable(RestClient::builder)),
      objectMapper,
      apiKey,
      apiUrl
    );
  }

  GeminiChatService(
    RestClient.Builder restClientBuilder,
    ObjectMapper objectMapper,
    String apiKey,
    String apiUrl
  ) {
    this(buildRestClient(restClientBuilder), objectMapper, apiKey, apiUrl);
  }

  GeminiChatService(
    RestClient restClient,
    ObjectMapper objectMapper,
    String apiKey,
    String apiUrl
  ) {
    this.restClient = restClient;
    this.objectMapper = objectMapper;
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  private static RestClient buildRestClient(RestClient.Builder builder) {
    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(Duration.ofSeconds(10));
    requestFactory.setReadTimeout(Duration.ofSeconds(30));
    return builder.requestFactory(requestFactory).build();
  }

  public String getGeminiResponse(String prompt) {
    if (apiKey == null || apiKey.isBlank()) {
      throw new ApiException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "AI_UNAVAILABLE",
        "Dịch vụ AI chưa được cấu hình."
      );
    }
    if (prompt == null || prompt.isBlank()) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        "INVALID_PROMPT",
        "Nội dung câu hỏi không được để trống."
      );
    }

    Map<String, Object> payload = Map.of(
      "contents",
      List.of(Map.of("parts", List.of(Map.of("text", prompt))))
    );

    String responseBody;
    try {
      responseBody = restClient
        .post()
        .uri(apiUrl)
        .header("x-goog-api-key", apiKey)
        .contentType(MediaType.APPLICATION_JSON)
        .body(payload)
        .retrieve()
        .body(String.class);
    } catch (RestClientResponseException ex) {
      logger.error("Gemini API error: status={}", ex.getStatusCode().value());
      throw new ApiException(
        HttpStatus.BAD_GATEWAY,
        "AI_UPSTREAM_ERROR",
        "Không thể kết nối tới dịch vụ AI."
      );
    } catch (RestClientException ex) {
      logger.error("Gemini API transport failure: {}", ex.getMessage());
      throw new ApiException(
        HttpStatus.BAD_GATEWAY,
        "AI_UPSTREAM_ERROR",
        "Không thể kết nối tới dịch vụ AI."
      );
    }

    if (responseBody == null || responseBody.isBlank()) {
      throw new ApiException(
        HttpStatus.BAD_GATEWAY,
        "AI_INVALID_RESPONSE",
        "Phản hồi từ dịch vụ AI không hợp lệ."
      );
    }

    try {
      JsonNode root = objectMapper.readTree(responseBody);
      JsonNode textNode = root
        .path("candidates")
        .path(0)
        .path("content")
        .path("parts")
        .path(0)
        .path("text");
      if (textNode.isMissingNode() || textNode.isNull() || textNode.asString("").isBlank()) {
        throw new ApiException(
          HttpStatus.BAD_GATEWAY,
          "AI_INVALID_RESPONSE",
          "Phản hồi từ dịch vụ AI không hợp lệ."
        );
      }
      return textNode.asString();
    } catch (JacksonException ex) {
      logger.error("Failed to parse Gemini response: {}", ex.getMessage());
      throw new ApiException(
        HttpStatus.BAD_GATEWAY,
        "AI_INVALID_RESPONSE",
        "Phản hồi từ dịch vụ AI không hợp lệ."
      );
    }
  }
}
