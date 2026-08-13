package com.example.businessstore.service.impl;

import com.example.businessstore.dto.response.PhotobookDesignResponse;
import com.example.businessstore.entity.PhotobookDesign;
import com.example.businessstore.entity.PhotobookDesignImage;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookDesignRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.service.MediaStorageService;
import com.example.businessstore.service.PhotobookDesignService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@Slf4j
@RequiredArgsConstructor
public class PhotobookDesignServiceImpl implements PhotobookDesignService {

    private final PhotobookDesignRepository repository;
    private final UserRepository userRepository;
    private final MediaStorageService mediaStorageService;
    private final PhotobookSpreadsPayloadValidator payloadValidator;

    @Override
    @Transactional
    public PhotobookDesignResponse create(java.util.UUID userId, String metadataJson, List<MultipartFile> images) {
        JsonNode metadata = payloadValidator.parseMetadata(metadataJson, "productSlug", "pageCount", "spreads");
        int pageCount = requirePageCount(metadata);
        JsonNode spreads = metadata.get("spreads");
        // Một cuốn N trang phải có đúng N/2 spread — lệch số này nghĩa là FE và BE đã tính trang
        // khác nhau, hydrate sau này sẽ tạo ra một cuốn sai số trang so với cái khách đã trả tiền.
        if (!spreads.isArray() || spreads.size() != pageCount / 2) {
            throw new AppException(ErrorCode.INVALID_REQUEST,
                    "Số trang đôi phải bằng một nửa số trang.");
        }
        Set<String> referencedImageIds = payloadValidator.imageIdsIn(spreads);
        Set<String> uploadedImageIds = payloadValidator.uploadedImageIds(images);
        if (!referencedImageIds.equals(uploadedImageIds)) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Ảnh tải lên phải khớp với ảnh đã đặt trong các trang đôi.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED, "Không tìm thấy tài khoản của phiên đăng nhập này."));

        PhotobookDesign design = new PhotobookDesign();
        design.setUser(user);
        design.setProductSlug(payloadValidator.textField(metadata, "productSlug"));
        design.setSizeLabel(payloadValidator.optionalField(metadata, "sizeLabel"));
        design.setPageCount(pageCount);
        design.setFinish(payloadValidator.optionalField(metadata, "finish"));
        design.setTemplateId(payloadValidator.optionalField(metadata, "templateId"));
        design.setSpreadsJson(payloadValidator.nodeToString(spreads));
        repository.save(design);

        List<String> uploadedMediaIds = new ArrayList<>();
        try {
            for (MultipartFile file : images) {
                String imageKey = file.getOriginalFilename();
                MediaStorageService.UploadedMedia uploaded =
                        mediaStorageService.uploadPhotobookDesignImage(design.getId(), file);
                uploadedMediaIds.add(uploaded.publicId());
                PhotobookDesignImage img = new PhotobookDesignImage();
                img.setDesign(design);
                img.setImageKey(imageKey);
                img.setPublicId(uploaded.publicId());
                img.setSecureUrl(uploaded.secureUrl());
                design.getImages().add(img);
            }
            repository.save(design);
            return new PhotobookDesignResponse(design.getId());
        } catch (RuntimeException exception) {
            uploadedMediaIds.forEach(this::deletePhotobookDesignImageSafely);
            throw exception;
        }
    }

    private int requirePageCount(JsonNode metadata) {
        JsonNode value = metadata.get("pageCount");
        if (value == null || value.isNull() || !value.canConvertToInt() || value.asInt() <= 0) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Số trang phải là số nguyên dương.");
        }
        return value.asInt();
    }

    private void deletePhotobookDesignImageSafely(String publicId) {
        try {
            mediaStorageService.deletePhotobookDesignImage(publicId);
        } catch (RuntimeException exception) {
            log.warn("Could not remove photobook design image {}", publicId, exception);
        }
    }
}
