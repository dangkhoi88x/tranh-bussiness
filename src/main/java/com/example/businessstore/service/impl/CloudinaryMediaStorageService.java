package com.example.businessstore.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import com.example.businessstore.configuration.CloudinaryProperties;
import com.example.businessstore.configuration.MediaProperties;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.service.MediaStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryMediaStorageService implements MediaStorageService {

    private static final Set<String> SUPPORTED_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final String PDF_CONTENT_TYPE = "application/pdf";

    private final Cloudinary cloudinary;
    private final CloudinaryProperties cloudinaryProperties;
    private final MediaProperties mediaProperties;

    @Override
    public UploadedMedia uploadProductImage(UUID productId, MultipartFile file) {
        return uploadImage("business-store/products/" + productId, file);
    }

    @Override
    public UploadedMedia uploadFrameImage(UUID frameId, MultipartFile file) {
        return uploadImage("business-store/frames/" + frameId, file);
    }

    @Override
    public UploadedMedia uploadCustomOrderImage(UUID requestId, MultipartFile file) {
        return uploadImage("business-store/custom-order-requests/" + requestId, file, "authenticated");
    }

    @Override
    public UploadedMedia uploadPhotobookPhoto(UUID projectId, MultipartFile file) {
        return uploadImage("business-store/photobook-projects/" + projectId, file, "authenticated");
    }

    /**
     * Bản mềm nạp bằng resource_type "image" kể cả khi là PDF — đó là điều kiện để Cloudinary
     * render được từng trang thành ảnh (transformation pg_N) cho khách lật xem inline.
     */
    @Override
    public UploadedMedia uploadPhotobookProof(UUID projectId, MultipartFile file) {
        validateProof(file);
        requireConfigured();
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", "business-store/photobook-proofs/" + projectId,
                    "public_id", UUID.randomUUID().toString(),
                    "resource_type", "image",
                    "type", "authenticated",
                    "overwrite", false));
            String publicId = stringResult(result, "public_id");
            String secureUrl = stringResult(result, "secure_url");
            if (publicId == null || secureUrl == null) {
                throw new AppException(ErrorCode.MEDIA_UPLOAD_FAILED, "Cloudinary did not return proof details");
            }
            return new UploadedMedia(publicId, secureUrl, pageCount(result));
        } catch (IOException exception) {
            log.warn("Cloudinary proof upload failed", exception);
            throw new AppException(ErrorCode.MEDIA_UPLOAD_FAILED, "Could not upload proof");
        }
    }

    /** Cloudinary trả "pages" cho PDF; ảnh đơn không có trường này. */
    private int pageCount(Map<?, ?> result) {
        Object pages = result.get("pages");
        if (pages instanceof Number number && number.intValue() > 0) {
            return number.intValue();
        }
        return 1;
    }

    @Override
    public String signedPrivatePageUrl(String publicId, int page) {
        requireConfigured();
        return cloudinary.url()
                .resourceType("image")
                .type("authenticated")
                .secure(true)
                .signed(true)
                .transformation(new Transformation<>().page(Math.max(page, 1)).quality("auto"))
                .format("jpg")
                .generate(publicId);
    }

    private UploadedMedia uploadImage(String folder, MultipartFile file) {
        return uploadImage(folder, file, "upload");
    }

    private UploadedMedia uploadImage(String folder, MultipartFile file, String deliveryType) {
        validateImage(file);
        requireConfigured();
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.asMap(
                    "folder", folder,
                    "public_id", UUID.randomUUID().toString(),
                    "resource_type", "image",
                    "type", deliveryType,
                    "overwrite", false));
            String publicId = stringResult(result, "public_id");
            String secureUrl = stringResult(result, "secure_url");
            if (publicId == null || secureUrl == null) {
                throw new AppException(ErrorCode.MEDIA_UPLOAD_FAILED, "Cloudinary did not return image details");
            }
            return new UploadedMedia(publicId, secureUrl);
        } catch (IOException exception) {
            log.warn("Cloudinary image upload failed", exception);
            throw new AppException(ErrorCode.MEDIA_UPLOAD_FAILED, "Could not upload image");
        }
    }

    @Override
    public void deleteImage(String publicId) {
        destroyImage(publicId, "upload");
    }

    @Override
    public void deletePrivateImage(String publicId) {
        destroyImage(publicId, "authenticated");
    }

    @Override
    public String signedPrivateImageUrl(String publicId) {
        requireConfigured();
        return cloudinary.url()
                .resourceType("image")
                .type("authenticated")
                .secure(true)
                .signed(true)
                .generate(publicId);
    }

    private void destroyImage(String publicId, String deliveryType) {
        requireConfigured();
        try {
            Map<?, ?> result = cloudinary.uploader().destroy(publicId, ObjectUtils.asMap(
                    "resource_type", "image",
                    "type", deliveryType,
                    "invalidate", true));
            String status = stringResult(result, "result");
            if (status != null && !"ok".equals(status) && !"not found".equals(status)) {
                throw new AppException(ErrorCode.MEDIA_DELETE_FAILED, "Could not delete image");
            }
        } catch (IOException exception) {
            log.warn("Cloudinary image deletion failed for publicId={}", publicId, exception);
            throw new AppException(ErrorCode.MEDIA_DELETE_FAILED, "Could not delete image");
        }
    }

    /**
     * Bản mềm cho phép thêm PDF, và có trần dung lượng riêng vì một cuốn 15 spread nặng hơn
     * nhiều so với một tấm ảnh sản phẩm.
     */
    private void validateProof(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE, "Proof file is required");
        }
        if (file.getSize() > mediaProperties.maxProofSizeBytes()) {
            throw new AppException(ErrorCode.IMAGE_FILE_TOO_LARGE, "Proof exceeds the allowed size");
        }
        String contentType = file.getContentType();
        boolean pdf = PDF_CONTENT_TYPE.equalsIgnoreCase(contentType) && hasPdfSignature(file);
        boolean image = contentType != null
                && SUPPORTED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))
                && hasImageSignature(file);
        if (!pdf && !image) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE, "Only PDF, JPEG, PNG, and WebP proofs are allowed");
        }
    }

    private boolean hasPdfSignature(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            byte[] header = inputStream.readNBytes(5);
            return header.length == 5
                    && header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44
                    && header[3] == 0x46 && header[4] == 0x2D; // %PDF-
        } catch (IOException exception) {
            return false;
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE, "Image file is required");
        }
        if (file.getSize() > mediaProperties.maxImageSizeBytes()) {
            throw new AppException(ErrorCode.IMAGE_FILE_TOO_LARGE, "Image exceeds the allowed size");
        }
        String contentType = file.getContentType();
        if (contentType == null || !SUPPORTED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT)) || !hasImageSignature(file)) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE, "Only JPEG, PNG, and WebP images are allowed");
        }
    }

    private boolean hasImageSignature(MultipartFile file) {
        try (InputStream inputStream = file.getInputStream()) {
            byte[] header = inputStream.readNBytes(12);
            boolean jpeg = header.length >= 3
                    && (header[0] & 0xFF) == 0xFF
                    && (header[1] & 0xFF) == 0xD8
                    && (header[2] & 0xFF) == 0xFF;
            boolean png = header.length >= 8
                    && (header[0] & 0xFF) == 0x89
                    && header[1] == 0x50
                    && header[2] == 0x4E
                    && header[3] == 0x47
                    && header[4] == 0x0D
                    && header[5] == 0x0A
                    && header[6] == 0x1A
                    && header[7] == 0x0A;
            boolean webp = header.length >= 12
                    && header[0] == 0x52
                    && header[1] == 0x49
                    && header[2] == 0x46
                    && header[3] == 0x46
                    && header[8] == 0x57
                    && header[9] == 0x45
                    && header[10] == 0x42
                    && header[11] == 0x50;
            return jpeg || png || webp;
        } catch (IOException exception) {
            return false;
        }
    }

    private void requireConfigured() {
        if (!cloudinaryProperties.isConfigured()) {
            throw new AppException(ErrorCode.MEDIA_PROVIDER_NOT_CONFIGURED, "Cloudinary is not configured");
        }
    }

    private String stringResult(Map<?, ?> result, String key) {
        Object value = result.get(key);
        return value == null ? null : value.toString();
    }
}
