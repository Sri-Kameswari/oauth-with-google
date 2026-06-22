package com.skt.oauth.oauth;

import com.fasterxml.jackson.annotation.JsonProperty;

public class TokenResponse {

  @JsonProperty("access_token")
  private String accessToken;

  @JsonProperty("id_token")
  private String idToken;

  @JsonProperty("expires_in")
  private int expiresIn;

  @JsonProperty("token_type")
  private String tokenType;

  @JsonProperty("scope")
  private String scope;

  public String getAccessToken() { return accessToken; }
  public String getIdToken() { return idToken; }
  public int getExpiresIn() { return expiresIn; }
  public String getTokenType() { return tokenType; }
  public String getScope() { return scope; }
}