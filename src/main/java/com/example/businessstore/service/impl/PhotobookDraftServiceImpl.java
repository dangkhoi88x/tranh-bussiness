package com.example.businessstore.service.impl;

import com.example.businessstore.dto.response.PhotobookDraftResponse;
import com.example.businessstore.entity.PhotobookDraft;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookDraftRepository;
import com.example.businessstore.service.PhotobookDraftService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PhotobookDraftServiceImpl implements PhotobookDraftService {

    private static final int MAX_DRAFT_JSON_CHARS = 500_000;

    private final PhotobookDraftRepository repository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public PhotobookDraftResponse save(UUID userId, String productSlug, String draftJson) {
        validateDraft(productSlug, draftJson);

        PhotobookDraft draft = repository.findByUserIdAndProductSlug(userId, productSlug)
                .orElseGet(() -> {
                    PhotobookDraft d = new PhotobookDraft();
                    d.setUserId(userId);
                    d.setProductSlug(productSlug);
                    return d;
                });
        draft.setDraftJson(draftJson);
        draft = repository.save(draft);
        return toResponse(draft);
    }

    @Override
    @Transactional(readOnly = true)
    public PhotobookDraftResponse load(UUID userId, String productSlug) {
        return repository.findByUserIdAndProductSlug(userId, productSlug)
                .map(this::toResponse)
                .orElse(null);
    }

    @Override
    @Transactional
    public void delete(UUID userId, String productSlug) {
        repository.deleteByUserIdAndProductSlug(userId, productSlug);
    }

    private PhotobookDraftResponse toResponse(PhotobookDraft draft) {
        return new PhotobookDraftResponse(
                draft.getProductSlug(),
                draft.getDraftJson(),
                draft.getUpdatedAt()
        );
    }

    private void validateDraft(String productSlug, String draftJson) {
        if (productSlug == null || productSlug.isBlank() || productSlug.length() > 255) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Sản phẩm photobook không hợp lệ.");
        }
        if (draftJson == null || draftJson.isBlank() || draftJson.length() > MAX_DRAFT_JSON_CHARS) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Bản nháp quá lớn.");
        }
        try {
            JsonNode draft = objectMapper.readTree(draftJson);
            JsonNode draftSlug = draft == null ? null : draft.get("slug");
            if (draft == null || !draft.isObject() || draftSlug == null || !draftSlug.isTextual()
                    || !productSlug.equals(draftSlug.asText())) {
                throw new AppException(ErrorCode.INVALID_REQUEST, "Bản nháp không khớp với sản phẩm photobook.");
            }
        } catch (JacksonException exception) {
            throw new AppException(ErrorCode.INVALID_REQUEST, "Dữ liệu bản nháp không hợp lệ.");
        }
    }
}
