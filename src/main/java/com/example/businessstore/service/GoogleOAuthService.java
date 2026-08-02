package com.example.businessstore.service;

public interface GoogleOAuthService {

    GoogleProfile authenticate(String authorizationCode, String redirectUri);

    record GoogleProfile(String email, String givenName, String familyName) {
    }
}
