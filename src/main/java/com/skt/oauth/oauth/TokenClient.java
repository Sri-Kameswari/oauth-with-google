package com.skt.oauth.oauth;

import com.skt.oauth.config.GoogleOAuthProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

/*
* Component
* This class is a Spring-managed bean.
* Create an instance of it and make it available for dependency injection.
* */
@Component
public class TokenClient {

  private final GoogleOAuthProperties oauthProperties;
  private final RestClient restClient;

  public TokenClient(GoogleOAuthProperties oauthProperties) {
    this.oauthProperties = oauthProperties;
    this.restClient = RestClient.create();
  }

  public TokenResponse exchange(String authorizationCode) {

    //MultiValueMap<K, V> is essentially: Map<K, List<V>>
    //Why MultiValueMap - HTTP form bodies could have multiple values. E.g. scope - profile, email, contacts

    MultiValueMap<String, String> formParams = new LinkedMultiValueMap<>();
    formParams.add("code", authorizationCode);
    formParams.add("client_id", oauthProperties.getClientId());
    formParams.add("client_secret", oauthProperties.getClientSecret());
    formParams.add("redirect_uri", oauthProperties.getRedirectUri());
    formParams.add("grant_type", "authorization_code");

    /*
    * A REST client in Spring Boot is a component that sends HTTP requests to another service/API and receives responses.
    *
    * A REST Controller receives requests from clients.
    * A REST Client makes requests to other servers.
    * */

    // POST to Google's token endpoint, parse response into TokenResponse
    return restClient.post()
        .uri(oauthProperties.getTokenEndpoint())
        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
        .body(formParams)
        .retrieve()
        .body(TokenResponse.class);
  }
}
