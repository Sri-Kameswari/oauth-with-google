package com.skt.oauth.controller;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.Base64;

import com.skt.oauth.config.GoogleOAuthProperties;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
public class AuthController {

  private final GoogleOAuthProperties oauthProperties;

  @Autowired
  public AuthController(GoogleOAuthProperties oauthProperties) {
    this.oauthProperties = oauthProperties;
  }

  @GetMapping("/oauth2/authorize/google")
  public void authorize(HttpSession session, HttpServletResponse response) throws IOException {

    String state = generateRandomValue();
    session.setAttribute("oauth_state", state);

    String authorizationUrl = UriComponentsBuilder
        .fromUriString(oauthProperties.getAuthorizationEndpoint())
        .queryParam("client_id", oauthProperties.getClientId())
        .queryParam("redirect_uri", oauthProperties.getRedirectUri())
        .queryParam("response_type", "code")
        .queryParam("scope", oauthProperties.getScope())
        .queryParam("state", state)
        .build()
        .toUriString();

    response.sendRedirect(authorizationUrl);

  }

  @GetMapping("/login/oauth2/callback/google")
  public String callback(
      @RequestParam(value = "code", required = false) String code,
      @RequestParam(value = "state", required = false) String state,
      @RequestParam(value = "error", required = false) String error,
      HttpSession session) {

    if(error != null) {
      return "Login failed: " + error;
    }

    if (state == null || code == null) {
      return "Invalid callback: missing state or code";
    }

    // Validate state against what we stored in the session
    String savedState = (String) session.getAttribute("oauth_state");

    if (savedState == null || !savedState.equals(state)) {
      return "State mismatch — possible CSRF attack, aborting login";
    }

    // State is valid — remove it from session so it can't be reused
    session.removeAttribute("oauth_state");

    return "Callback received. Code starts with: " + code.substring(0, 10) + "...";
  }

  private String generateRandomValue() {
    SecureRandom secureRandom = new SecureRandom();
    byte[] randomBytes = new byte[32];
    secureRandom.nextBytes(randomBytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
  }
}
