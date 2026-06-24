package com.skt.oauth.oauth;

import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.SignedJWT;
import com.skt.oauth.config.GoogleOAuthProperties;
import org.springframework.stereotype.Component;

@Component
public class IdTokenValidator {

  private final GoogleOAuthProperties oauthProperties;
  private final JwksClient jwksClient;

  public IdTokenValidator(GoogleOAuthProperties oauthProperties,  JwksClient jwksClient) {
    this.oauthProperties = oauthProperties;
    this.jwksClient = jwksClient;
  }

  public Map<String, Object> validate(String idToken) throws Exception {

    //parse JWT

    SignedJWT signedJWT;

    try{
      signedJWT = SignedJWT.parse(idToken);
    } catch(ParseException e){
      throw new Exception("Invalid idToken: " + e.getMessage());
    }

    //read keyId (kid) from header, find matching public key
    String kid  = signedJWT.getHeader().getKeyID();
    JWKSet jwkSet = jwksClient.getJwkSet(); //JWKSet - contains all public keys
    JWK jwk = jwkSet.getKeyByKeyId(kid);

    //in case Google rotated the keys
    if(jwk == null){
      jwkSet = jwksClient.forceRefresh();
      jwk = jwkSet.getKeyByKeyId(kid);
    }

    if(jwk == null){
      throw new Exception("No matching public key found for kid");
    }

    //verify the signature (using RSA public key)
    RSAKey rsaKey = (RSAKey) jwk;
    JWSVerifier verifier = new RSASSAVerifier(rsaKey.toRSAPublicKey());
    boolean verified = signedJWT.verify(verifier);

    if(!verified){
      throw new Exception("ID token verification failed");
    }

    // Extract and validate claims (data in payload)
    Map<String, Object> claims = signedJWT.getJWTClaimsSet().getClaims();

    String issuer = (String) claims.get("iss");
    if(!oauthProperties.getIssuer().equals(issuer)){
      throw new Exception("ID token issuer mismatch");
    }

    //validate audience - client id must match
    Object audience =  claims.get("aud");
    String audienceString = audience instanceof java.util.List
        ? ((java.util.List<?>) audience).get(0).toString()
        : audience.toString();

    if(!oauthProperties.getClientId().equals(audienceString)){
      throw new Exception("ID token audience mismatch");
    }

    //validate expiry
    Date exp = (Date) claims.get("exp");
    if (exp == null || exp.toInstant().isBefore(Instant.now())) {
      throw new Exception("ID token has expired");
    }

    //Validate issued-at (not more than 5 minutes in the future, clock skew tolerance)
    Date iat = (Date) claims.get("iat");
    if (iat == null || iat.toInstant().isAfter(Instant.now().plusSeconds(300))) {
        throw new Exception("ID token iat is too far in the future");
    }

    return claims;
  }
}
