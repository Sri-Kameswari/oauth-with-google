package com.skt.oauth.oauth;

import com.nimbusds.jose.jwk.JWKSet;
import com.skt.oauth.config.GoogleOAuthProperties;
import org.springframework.stereotype.Component;

import java.net.URL;

@Component
public class JwksClient {

  private final GoogleOAuthProperties oauthProperties;

  // Simple in-memory cache — avoid fetching on every login
  private JWKSet cachedJwkSet;

  public JwksClient(GoogleOAuthProperties oauthProperties) {
    this.oauthProperties = oauthProperties;
  }

  public JWKSet getJwkSet() throws Exception {
    if (cachedJwkSet == null) {
      cachedJwkSet = JWKSet.load(new URL(oauthProperties.getJwksEndpoint()));
    }
    return cachedJwkSet;
  }

  // Called when we encounter a kid we don't recognise — Google may have rotated keys
  public JWKSet forceRefresh() throws Exception {
    cachedJwkSet = JWKSet.load(new URL(oauthProperties.getJwksEndpoint()));
    return cachedJwkSet;
  }
}