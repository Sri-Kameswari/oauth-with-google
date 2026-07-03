package com.skt.oauth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
public class CorsConfig {

  private final GoogleOAuthProperties oauthProperties;

  public CorsConfig(GoogleOAuthProperties oauthProperties) {
    this.oauthProperties = oauthProperties;
  }

  @Bean
  public CorsFilter corsFilter() {

    CorsConfiguration config = new CorsConfiguration();

    config.setAllowedOrigins(List.of(oauthProperties.getFrontendUrl()));

    config.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));

    // Allow the session cookie to be sent with cross-origin requests
    config.setAllowCredentials(true);

    config.setAllowedHeaders(List.of("*"));

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

    // Apply this config to every endpoint
    source.registerCorsConfiguration("/**", config);

    return new CorsFilter(source);
  }
}