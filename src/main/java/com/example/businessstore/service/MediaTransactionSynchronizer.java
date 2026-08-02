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
        deleteAfterRollback(publicId, false);
    }

    public void deleteCustomOrderImageAfterRollback(String publicId) {
        deleteAfterRollback(publicId, true);
    }

    private void deleteAfterRollback(String publicId, boolean customOrderImage) {
        if (isBlank(publicId) || !TransactionSynchronizationManager.isSynchronizationActive()) {
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    deleteQuietly(publicId, customOrderImage);
                }
            }
        });
    }

    public void deleteQuietly(String publicId) {
        deleteQuietly(publicId, false);
    }

    public void deleteCustomOrderImageQuietly(String publicId) {
        deleteQuietly(publicId, true);
    }

    private void deleteQuietly(String publicId, boolean customOrderImage) {
        if (isBlank(publicId)) {
            return;
        }
        try {
            if (customOrderImage) mediaStorageService.deleteCustomOrderImage(publicId);
            else mediaStorageService.deleteImage(publicId);
        } catch (RuntimeException exception) {
            log.error("Media cleanup failed for publicId={}", publicId, exception);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
