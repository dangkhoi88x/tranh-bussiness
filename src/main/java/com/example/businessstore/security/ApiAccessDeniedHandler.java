package com.example.businessstore.security;

import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.ApiError;
import com.example.businessstore.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
public class ApiAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiError error = new ApiError(ErrorCode.FORBIDDEN.value(), request.getRequestURI(), Map.of());
        objectMapper.writeValue(response.getOutputStream(), ApiResponse.error(error, "You do not have permission"));
    }
}
