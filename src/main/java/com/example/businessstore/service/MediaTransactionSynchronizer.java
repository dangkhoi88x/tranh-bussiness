package com.example.businessstore.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Slf4j
@Component
@RequiredArgsConstructor
public class MediaTransactionSynchronizer {

    private final MediaStorageService mediaStorageService;

    public void deleteAfterCommit(String publicId) {
        if (isBlank(publicId)) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            deleteQuietly(publicId);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteQuietly(publicId);
            }
        });
    }

    public void deleteAfterRollback(String publicId) {
        if (isBlank(publicId) || !TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    deleteQuietly(publicId);
                }
            }
        });
    }

    public void deleteQuietly(String publicId) {
        if (isBlank(publicId)) {
            return;
        }
        try {
            mediaStorageService.deleteImage(publicId);
        } catch (RuntimeException exception) {
            log.error("Media cleanup failed for publicId={}", publicId, exception);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
