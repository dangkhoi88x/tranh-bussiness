package com.example.businessstore.service;

public interface GoogleOAuthService {

    GoogleProfile authenticate(String authorizationCode, String redirectUri);

    record GoogleProfile(String subject, String email, String givenName, String familyName) {
    }
}
