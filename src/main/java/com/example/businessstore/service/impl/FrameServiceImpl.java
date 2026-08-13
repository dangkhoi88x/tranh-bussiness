package com.example.businessstore.service.impl;

import com.example.businessstore.constant.FrameStatus;
import com.example.businessstore.dto.request.CreateFrameRequest;
import com.example.businessstore.dto.request.UpdateFrameRequest;
import com.example.businessstore.dto.response.FrameResponse;
import com.example.businessstore.entity.Frame;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.mapper.FrameMapper;
import com.example.businessstore.repository.FrameRepository;
import com.example.businessstore.repository.ProductFrameOptionRepository;
import com.example.businessstore.service.FrameService;
import com.example.businessstore.service.MediaStorageService;
import com.example.businessstore.service.MediaTransactionSynchronizer;
import com.example.businessstore.util.SlugUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FrameServiceImpl implements FrameService {

    private final FrameRepository frameRepository;
    private final ProductFrameOptionRepository productFrameOptionRepository;
    private final FrameMapper frameMapper;
    private final MediaStorageService mediaStorageService;
    private final MediaTransactionSynchronizer mediaTransactionSynchronizer;

    @Override
    @Transactional
    public FrameResponse create(CreateFrameRequest request) {
        String name = normalizeRequired(request.name());
        if (frameRepository.existsByNameIgnoreCase(name)) {
            throw new AppException(ErrorCode.FRAME_NAME_ALREADY_EXISTS, "Đã có khung tranh dùng tên này.");
        }
        Frame frame = new Frame();
        frame.setName(name);
        frame.setSlug(generateUniqueSlug(name, null));
        frame.setMaterial(normalizeRequired(request.material()));
        frame.setColor(normalizeRequired(request.color()));
        frame.setWidthMm(request.widthMm());
        frame.setPriceAdjustment(request.priceAdjustment());
        frame.setDescription(normalizeDescription(request.description()));
        frame.setStatus(request.status() == null ? FrameStatus.ACTIVE : request.status());
        return frameMapper.toResponse(frameRepository.save(frame));
    }

    @Override
    @Transactional(readOnly = true)
    public List<FrameResponse> findActive() {
        return frameRepository.findAllByStatusOrderByNameAsc(FrameStatus.ACTIVE).stream()
                .map(frameMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public FrameResponse findActiveById(UUID id) {
        Frame frame = frameRepository.findById(id)
                .filter(item -> item.getStatus() == FrameStatus.ACTIVE)
                .orElseThrow(() -> new AppException(ErrorCode.FRAME_NOT_FOUND, "Không tìm thấy khung tranh."));
        return frameMapper.toResponse(frame);
    }

    @Override
    @Transactional(readOnly = true)
    public FrameResponse findActiveBySlug(String slug) {
        Frame frame = frameRepository.findBySlugAndStatus(slug, FrameStatus.ACTIVE)
                .orElseThrow(() -> new AppException(ErrorCode.FRAME_NOT_FOUND, "Không tìm thấy khung tranh."));
        return frameMapper.toResponse(frame);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FrameResponse> findAllForManagement() {
        return frameRepository.findAllByOrderByNameAsc().stream()
                .map(frameMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public FrameResponse findForManagement(UUID id) {
        return frameMapper.toResponse(getFrame(id));
    }

    @Override
    @Transactional
    public FrameResponse update(UUID id, UpdateFrameRequest request) {
        Frame frame = getFrame(id);
        if (request.name() != null) {
            String name = normalizeRequired(request.name());
            if (frameRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
                throw new AppException(ErrorCode.FRAME_NAME_ALREADY_EXISTS, "Đã có khung tranh dùng tên này.");
            }
            frame.setName(name);
            frame.setSlug(generateUniqueSlug(name, id));
        }
        if (request.material() != null) frame.setMaterial(normalizeRequired(request.material()));
        if (request.color() != null) frame.setColor(normalizeRequired(request.color()));
        if (request.widthMm() != null) frame.setWidthMm(request.widthMm());
        if (request.priceAdjustment() != null) frame.setPriceAdjustment(request.priceAdjustment());
        if (request.description() != null) frame.setDescription(normalizeDescription(request.description()));
        if (request.status() != null) frame.setStatus(request.status());
        return frameMapper.toResponse(frame);
    }

    @Override
    @Transactional
    public FrameResponse uploadImage(UUID id, MultipartFile file) {
        Frame frame = getFrame(id);
        MediaStorageService.UploadedMedia uploaded = mediaStorageService.uploadFrameImage(id, file);
        String previousPublicId = frame.getImagePublicId();
        try {
            frame.setImagePublicId(uploaded.publicId());
            frame.setImageUrl(uploaded.secureUrl());
            mediaTransactionSynchronizer.deleteAfterRollback(uploaded.publicId());
            mediaTransactionSynchronizer.deleteAfterCommit(previousPublicId);
            return frameMapper.toResponse(frame);
        } catch (RuntimeException exception) {
            mediaTransactionSynchronizer.deleteQuietly(uploaded.publicId());
            throw exception;
        }
    }

    @Override
    @Transactional
    public void deleteImage(UUID id) {
        Frame frame = getFrame(id);
        if (frame.getImagePublicId() != null) {
            String publicId = frame.getImagePublicId();
            frame.setImagePublicId(null);
            frame.setImageUrl(null);
            mediaTransactionSynchronizer.deleteAfterCommit(publicId);
        }
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        Frame frame = getFrame(id);
        if (productFrameOptionRepository.existsByFrameId(id)) {
            throw new AppException(ErrorCode.FRAME_IN_USE, "Hãy gỡ khung này khỏi các sản phẩm trước khi xoá.");
        }
        frameRepository.delete(frame);
        mediaTransactionSynchronizer.deleteAfterCommit(frame.getImagePublicId());
    }

    private Frame getFrame(UUID id) {
        return frameRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.FRAME_NOT_FOUND, "Không tìm thấy khung tranh."));
    }

    private String generateUniqueSlug(String name, UUID currentId) {
        String baseSlug = SlugUtils.toSlug(name);
        if (baseSlug.isBlank()) {
            throw new AppException(ErrorCode.INVALID_FRAME_NAME, "Tên khung phải có chữ hoặc số.");
        }
        String slug = baseSlug;
        int suffix = 2;
        while (currentId == null ? frameRepository.existsBySlug(slug) : frameRepository.existsBySlugAndIdNot(slug, currentId)) {
            slug = baseSlug + "-" + suffix++;
        }
        return slug;
    }

    private String normalizeRequired(String value) {
        return value.trim().replaceAll("\\s+", " ");
    }

    private String normalizeDescription(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
