package com.example.businessstore.service;

import com.example.businessstore.entity.User;
import org.springframework.security.oauth2.jwt.Jwt;

public interface JwtService {

    String createAccessToken(User user);

    String createRefreshToken(User user);

    Jwt decodeAccessToken(String rawToken);

    Jwt decodeRefreshToken(String rawToken);
}
