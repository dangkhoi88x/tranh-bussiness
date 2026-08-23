package com.example.businessstore.controller;

import com.example.businessstore.dto.response.ApiResponse;
import com.example.businessstore.dto.response.PhotobookDraftResponse;
import com.example.businessstore.service.PhotobookDraftService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/photobook-drafts")
@RequiredArgsConstructor
public class PhotobookDraftController {

    private final PhotobookDraftService draftService;

    @GetMapping("/{slug}")
    public ResponseEntity<ApiResponse<PhotobookDraftResponse>> load(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String slug) {
        PhotobookDraftResponse draft = draftService.load(userId(jwt), slug);
        if (draft == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.success(draft));
    }

    @PutMapping("/{slug}")
    public ResponseEntity<ApiResponse<PhotobookDraftResponse>> save(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String slug,
            @RequestBody String draftJson) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.success(draftService.save(userId(jwt), slug, draftJson)));
    }

    @DeleteMapping("/{slug}")
    public ResponseEntity<Void> delete(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String slug) {
        draftService.delete(userId(jwt), slug);
        return ResponseEntity.noContent().build();
    }

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
