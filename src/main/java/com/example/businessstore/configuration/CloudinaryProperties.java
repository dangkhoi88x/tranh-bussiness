package com.example.businessstore.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.media.cloudinary")
public record CloudinaryProperties(String cloudName, String apiKey, String apiSecret) {

    public boolean isConfigured() {
        return cloudName != null && !cloudName.isBlank()
                && apiKey != null && !apiKey.isBlank()
                && apiSecret != null && !apiSecret.isBlank();
    }
}
