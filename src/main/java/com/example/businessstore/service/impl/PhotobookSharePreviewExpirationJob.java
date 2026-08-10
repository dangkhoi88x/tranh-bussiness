package com.example.businessstore.service.impl;

import com.example.businessstore.service.PhotobookSharePreviewService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Removes expired share records and their authenticated media from Cloudinary. */
@Slf4j
@Component
@RequiredArgsConstructor
public class PhotobookSharePreviewExpirationJob {

    private final PhotobookSharePreviewService sharePreviewService;

    @Scheduled(fixedDelayString = "${app.photobook-share-preview.expiry-scan-ms:3600000}")
    public void deleteExpiredPreviews() {
        try {
            sharePreviewService.deleteExpiredPreviews();
        } catch (RuntimeException exception) {
            log.error("Failed to remove expired photobook share previews", exception);
        }
    }
}
