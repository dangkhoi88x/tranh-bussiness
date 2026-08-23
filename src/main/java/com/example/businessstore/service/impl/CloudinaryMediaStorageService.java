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

    @Override
    public UploadedMedia uploadSharePreviewImage(UUID previewId, MultipartFile file) {
        return uploadImage("business-store/photobook-share-previews/" + previewId, file, "authenticated");
    }

    @Override
    public String signedSharePreviewImageUrl(String publicId) {
        return signedPrivateImageUrl(publicId);
    }

    @Override
    public void deleteSharePreviewImage(String publicId) {
        deletePrivateImage(publicId);
    }

    @Override
    public UploadedMedia uploadPhotobookDesignImage(UUID designId, MultipartFile file) {
        return uploadImage("business-store/photobook-designs/" + designId, file, "authenticated");
    }

    @Override
    public String signedPhotobookDesignImageUrl(String publicId) {
        return signedPrivateImageUrl(publicId);
    }

    @Override
    public void deletePhotobookDesignImage(String publicId) {
        deletePrivateImage(publicId);
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
                throw new AppException(ErrorCode.MEDIA_UPLOAD_FAILED, "Không nhận được thông tin tệp bản mềm từ dịch vụ lưu trữ ảnh.");
            }
            return new UploadedMedia(publicId, secureUrl, pageCount(result));
        } catch (IOException exception) {
            log.warn("Cloudinary proof upload failed", exception);
            throw new AppException(ErrorCode.MEDIA_UPLOAD_FAILED, "Không tải lên được bản mềm.");
        } catch (AppException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw rejectedByProvider(exception, "bản mềm",
                    "Dịch vụ lưu trữ không đọc được tệp bản mềm này. Hãy xuất lại file rồi thử lần nữa.");
        }
    }

    /**
     * Chữ ký byte ở validateProof/validateImage chỉ soi được vài byte đầu, nên một tệp đúng
     * magic number mà hỏng cấu trúc bên trong vẫn lọt xuống tới đây và bị Cloudinary từ chối.
     * Cloudinary ném RuntimeException trần cho mọi phản hồi khác 200, còn lỗi mạng/timeout thì
     * ném IOException — nên nhánh này là "gửi được tới nơi nhưng bị từ chối nội dung", trả 422
     * thay vì để lọt ra ngoài thành 500 vô nghĩa. Lý do thật của Cloudinary (có thể là hết quota
     * hay sai khoá chứ không phải tệp hỏng) được log lại để còn lần ra khi có sự cố.
     */
    private AppException rejectedByProvider(RuntimeException exception, String subject, String message) {
        log.warn("Cloudinary rejected the uploaded {}: {}", subject, exception.getMessage(), exception);
        return new AppException(ErrorCode.MEDIA_FILE_REJECTED, message);
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
                throw new AppException(ErrorCode.MEDIA_UPLOAD_FAILED, "Không nhận được thông tin ảnh từ dịch vụ lưu trữ ảnh.");
            }
            return new UploadedMedia(publicId, secureUrl);
        } catch (IOException exception) {
            log.warn("Cloudinary image upload failed", exception);
            throw new AppException(ErrorCode.MEDIA_UPLOAD_FAILED, "Không tải lên được ảnh.");
        } catch (AppException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw rejectedByProvider(exception, "ảnh",
                    "Dịch vụ lưu trữ không đọc được tệp ảnh này. Hãy chọn ảnh khác hoặc xuất lại file.");
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
                throw new AppException(ErrorCode.MEDIA_DELETE_FAILED, "Không xoá được ảnh.");
            }
        } catch (IOException exception) {
            log.warn("Cloudinary image deletion failed for publicId={}", publicId, exception);
            throw new AppException(ErrorCode.MEDIA_DELETE_FAILED, "Không xoá được ảnh.");
        }
    }

    /**
     * Bản mềm cho phép thêm PDF, và có trần dung lượng riêng vì một cuốn 15 spread nặng hơn
     * nhiều so với một tấm ảnh sản phẩm.
     */
    private void validateProof(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE, "Vui lòng chọn tệp bản mềm.");
        }
        if (file.getSize() > mediaProperties.maxProofSizeBytes()) {
            throw new AppException(ErrorCode.IMAGE_FILE_TOO_LARGE, "Bản mềm vượt quá dung lượng cho phép.");
        }
        String contentType = file.getContentType();
        boolean pdf = PDF_CONTENT_TYPE.equalsIgnoreCase(contentType) && hasPdfSignature(file);
        boolean image = contentType != null
                && SUPPORTED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))
                && hasImageSignature(file);
        if (!pdf && !image) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE, "Bản mềm chỉ nhận định dạng PDF, JPEG, PNG hoặc WebP.");
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
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE, "Vui lòng chọn tệp ảnh.");
        }
        if (file.getSize() > mediaProperties.maxImageSizeBytes()) {
            throw new AppException(ErrorCode.IMAGE_FILE_TOO_LARGE, "Ảnh vượt quá dung lượng cho phép.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !SUPPORTED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT)) || !hasImageSignature(file)) {
            throw new AppException(ErrorCode.INVALID_IMAGE_FILE, "Ảnh chỉ nhận định dạng JPEG, PNG hoặc WebP.");
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
            throw new AppException(ErrorCode.MEDIA_PROVIDER_NOT_CONFIGURED, "Dịch vụ lưu trữ ảnh chưa được cấu hình.");
        }
    }

    private String stringResult(Map<?, ?> result, String key) {
        Object value = result.get(key);
        return value == null ? null : value.toString();
    }
}
