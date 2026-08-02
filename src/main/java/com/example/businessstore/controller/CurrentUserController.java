package com.example.businessstore.controller;

import com.example.businessstore.service.AuthenticationService;
import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class CurrentUserController {

    private final AuthenticationService authenticationService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> currentUser(@AuthenticationPrincipal Jwt jwt) {
        UserResponse user = authenticationService.currentUser(UUID.fromString(jwt.getSubject()));
        return ResponseEntity.ok(ApiResponse.success(user));
    }
}
