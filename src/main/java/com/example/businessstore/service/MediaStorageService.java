package com.example.businessstore.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface MediaStorageService {

    UploadedMedia uploadProductImage(UUID productId, MultipartFile file);

    UploadedMedia uploadFrameImage(UUID frameId, MultipartFile file);
    UploadedMedia uploadCustomOrderImage(UUID requestId, MultipartFile file);

    /** Ảnh gốc khách gửi cho một cuốn photobook — riêng tư như ảnh của custom order. */
    UploadedMedia uploadPhotobookPhoto(UUID projectId, MultipartFile file);

    /**
     * Bản mềm xưởng gửi khách duyệt — riêng tư, chỉ đọc qua URL đã ký. Nhận PDF nhiều trang
     * (mỗi trang một spread) hoặc một ảnh đơn; {@link UploadedMedia#pages()} cho biết có mấy trang.
     */
    UploadedMedia uploadPhotobookProof(UUID projectId, MultipartFile file);

    /**
     * URL đã ký của một trang trong tài liệu riêng tư, render sẵn thành ảnh. Nhờ vậy khách lật
     * xem từng spread ngay trên trang web thay vì phải tải cả file PDF về.
     *
     * @param page đánh số từ 1
     */
    String signedPrivatePageUrl(String publicId, int page);

    void deleteImage(String publicId);

    /* Ảnh riêng tư (Cloudinary delivery type "authenticated"): chỉ đọc được qua URL đã ký. */

    String signedPrivateImageUrl(String publicId);

    void deletePrivateImage(String publicId);

    default String signedCustomOrderImageUrl(String publicId) {
        return signedPrivateImageUrl(publicId);
    }

    default void deleteCustomOrderImage(String publicId) {
        deletePrivateImage(publicId);
    }

    UploadedMedia uploadSharePreviewImage(UUID previewId, MultipartFile file);

    String signedSharePreviewImageUrl(String publicId);

    void deleteSharePreviewImage(String publicId);

    record UploadedMedia(String publicId, String secureUrl, int pages) {

        /** Ảnh đơn: luôn đúng một trang. */
        public UploadedMedia(String publicId, String secureUrl) {
            this(publicId, secureUrl, 1);
        }
    }
}
