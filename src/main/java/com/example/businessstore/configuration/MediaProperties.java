package com.example.businessstore.configuration;

import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.media")
/**
 * Bản mềm photobook là PDF nhiều spread nên nặng hơn hẳn một tấm ảnh sản phẩm —
 * dùng chung trần 10MB sẽ chặn nhầm những cuốn dày.
 */
public record MediaProperties(@Positive long maxImageSizeBytes, @Positive long maxProofSizeBytes) {
}
