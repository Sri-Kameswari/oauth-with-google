package com.skt.oauth.controller;

import java.io.IOException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;

import com.skt.oauth.config.GoogleOAuthProperties;
import com.skt.oauth.oauth.IdTokenValidator;
import com.skt.oauth.oauth.TokenClient;
import com.skt.oauth.oauth.TokenResponse;
import com.skt.oauth.session.SessionUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

@RestController
public class AuthController {

  private final GoogleOAuthProperties oauthProperties;
  private final TokenClient tokenClient;
  private final IdTokenValidator idTokenValidator;

  @Autowired
  public AuthController(GoogleOAuthProperties oauthProperties, TokenClient tokenClient, IdTokenValidator idTokenValidator) {
    this.oauthProperties = oauthProperties;
    this.tokenClient = tokenClient;
    this.idTokenValidator = idTokenValidator;
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
  public void callback(
      @RequestParam(value = "code", required = false) String code,
      @RequestParam(value = "state", required = false) String state,
      @RequestParam(value = "error", required = false) String error,
      HttpSession session,
      HttpServletRequest request,
      HttpServletResponse response) throws IOException {

    if(error != null) {
      response.sendRedirect(oauthProperties.getFrontendUrl() + "?error=" + error);
      return;
    }

    if (state == null || code == null) {
      response.sendRedirect(oauthProperties.getFrontendUrl() + "?error=invalid_callback");
      return;
    }

    // Validate state against what we stored in the session
    String savedState = (String) session.getAttribute("oauth_state");

    if (savedState == null || !savedState.equals(state)) {
      response.sendRedirect(oauthProperties.getFrontendUrl() + "?error=state_mismatch");
      return;
    }

    // State is valid — remove it from session so it can't be reused
    session.removeAttribute("oauth_state");

    TokenResponse tokenResponse = tokenClient.exchange(code);
    try {
      Map<String, Object> claims = idTokenValidator.validate(tokenResponse.getIdToken());

      // Build a typed session user from validated claims
      SessionUser sessionUser = new SessionUser(
          (String) claims.get("sub"),
          (String) claims.get("email"),
          (String) claims.get("name"),
          (String) claims.get("picture")
      );

      session.invalidate();
      session = request.getSession(true);
      session.setAttribute("user", sessionUser);

      response.sendRedirect(oauthProperties.getFrontendUrl());
    } catch (Exception e) {
      response.sendRedirect(oauthProperties.getFrontendUrl() + "?error=" + e.getMessage());
    }
  }

  @GetMapping("/me")
  public ResponseEntity<?> me(HttpSession session) {

    SessionUser user = (SessionUser) session.getAttribute("user");

    if (user == null) {
      return ResponseEntity.status(401).body("Not logged in");
    }

    return ResponseEntity.ok(Map.of(
        "sub", user.getSub(),
        "email", user.getEmail(),
        "name", user.getName(),
        "picture", user.getPicture()
    ));
  }

  @GetMapping("/logout")
  public String logout(HttpSession session) {
    session.invalidate();
    return "Logged out successfully";
  }

  private String generateRandomValue() {
    SecureRandom secureRandom = new SecureRandom();
    byte[] randomBytes = new byte[32];
    secureRandom.nextBytes(randomBytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
  }
}
