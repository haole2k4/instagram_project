package com.example.backend_instagram.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
  private final AccountRestrictionInterceptor accountRestrictionInterceptor;

  public WebConfig(AccountRestrictionInterceptor accountRestrictionInterceptor) {
    this.accountRestrictionInterceptor = accountRestrictionInterceptor;
  }

  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry
      .addInterceptor(accountRestrictionInterceptor)
      .addPathPatterns("/api/**");
  }
}
