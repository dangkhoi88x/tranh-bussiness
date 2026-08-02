package com.example.businessstore.service;

import com.example.businessstore.entity.User;

public interface RefreshTokenService {

    String create(User user);

    User rotate(String rawToken);

    void revoke(String rawToken);
}
