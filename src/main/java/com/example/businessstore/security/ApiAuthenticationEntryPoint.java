package com.example.businessstore.security;

import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.ApiError;
import com.example.businessstore.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
public class ApiAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(
            HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authenticationException) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiError error = new ApiError(ErrorCode.UNAUTHORIZED.value(), request.getRequestURI(), Map.of());
        objectMapper.writeValue(response.getOutputStream(), ApiResponse.error(error, "Authentication is required"));
    }
}
