package com.example.businessstore.service.impl;

import com.example.businessstore.constant.PhotobookProjectStatus;
import com.example.businessstore.dto.response.PhotobookArrangementResponse;
import com.example.businessstore.dto.response.PhotobookLayoutResponse;
import com.example.businessstore.dto.response.PhotobookProjectResponse;
import com.example.businessstore.dto.response.PhotobookSpreadResponse;
import com.example.businessstore.entity.PhotobookLayout;
import com.example.businessstore.entity.PhotobookProject;
import com.example.businessstore.entity.PhotobookProjectPhoto;
import com.example.businessstore.entity.PhotobookSpread;
import com.example.businessstore.entity.PhotobookSpreadSlot;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookProjectRepository;
import com.example.businessstore.repository.PhotobookSpreadRepository;
import com.example.businessstore.repository.PhotobookSpreadSlotRepository;
import com.example.businessstore.service.MediaStorageService;
import com.example.businessstore.service.PhotobookArrangementService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PhotobookArrangementServiceImpl implements PhotobookArrangementService {

    private final PhotobookProjectRepository projectRepository;
    private final PhotobookSpreadRepository spreadRepository;
    private final PhotobookSpreadSlotRepository spreadSlotRepository;
    private final PhotobookLayoutEngine layoutEngine;
    private final MediaStorageService mediaStorageService;

    @Override
    @Transactional(readOnly = true)
    public PhotobookArrangementResponse getArrangement(UUID userId, UUID projectId) {
        PhotobookProject project = owned(userId, projectId);
        if (!spreadRepository.existsByPhotobookProjectId(projectId)) {
            throw new AppException(ErrorCode.PHOTOBOOK_ARRANGEMENT_NOT_READY,
                    "Submit your photos first so the studio can lay out the book");
        }
        return toArrangement(project);
    }

    @Override
    @Transactional
    public PhotobookArrangementResponse changeSpreadLayout(UUID userId, UUID projectId, UUID spreadId, String layoutCode) {
        PhotobookSpread spread = spreadRepository
                .findByIdAndPhotobookProjectIdAndPhotobookProjectUserId(spreadId, projectId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_SPREAD_NOT_FOUND, "Spread not found"));
        requireArrangementEditable(spread.getPhotobookProject());
        PhotobookLayout newLayout = layoutEngine.requireLayout(layoutCode);

        List<PhotobookSpreadSlot> oldSlots = new ArrayList<>(spread.getSlots());
        List<PhotobookSpreadSlot> newSlots = layoutEngine.rebuildSlots(spread, newLayout);

        // Xoá và flush trước khi chèn ô mới: layout mới có thể dùng lại cùng slot_index của
        // layout cũ, và ràng buộc unique (spread_id, slot_index) sẽ chặn nếu hai câu lệnh
        // chồng lên nhau trong cùng một đợt flush.
        spread.getSlots().clear();
        spreadSlotRepository.deleteAll(oldSlots);
        spreadSlotRepository.flush();

        spread.setLayoutCode(newLayout.getCode());
        spread.getSlots().addAll(newSlots);
        spreadRepository.save(spread);

        return toArrangement(spread.getPhotobookProject());
    }

    @Override
    @Transactional
    public PhotobookArrangementResponse assignPhoto(UUID userId, UUID projectId, UUID slotId, UUID photoId) {
        PhotobookProject project = owned(userId, projectId);
        requireArrangementEditable(project);

        PhotobookSpreadSlot targetSlot = spreadSlotRepository
                .findByIdAndPhotobookSpreadPhotobookProjectIdAndPhotobookSpreadPhotobookProjectUserId(slotId, projectId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_SLOT_NOT_FOUND, "Slot not found"));

        if (photoId == null) {
            targetSlot.setPhoto(null);
            spreadSlotRepository.save(targetSlot);
            return toArrangement(project);
        }

        PhotobookProjectPhoto photo = project.getPhotos().stream()
                .filter(item -> item.getId().equals(photoId))
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_PHOTO_NOT_IN_PROJECT,
                        "Photo does not belong to this photobook"));

        if (targetSlot.getPhoto() != null && targetSlot.getPhoto().getId().equals(photoId)) {
            return toArrangement(project);
        }

        Optional<PhotobookSpreadSlot> sourceSlot = spreadSlotRepository
                .findByPhotobookSpreadPhotobookProjectIdAndPhotoId(projectId, photoId);
        PhotobookProjectPhoto displaced = targetSlot.getPhoto();

        if (sourceSlot.isPresent() && !sourceSlot.get().getId().equals(targetSlot.getId())) {
            // "Hoán vị": ảnh đang ở chỗ khác trong cuốn này thì hai ô đổi cho nhau, không sao chép.
            // Dọn chỗ cũ và flush trước khi gán chỗ mới — ràng buộc unique một phần trên
            // photobook_project_photo_id chỉ cho một ô tham chiếu một ảnh tại một thời điểm.
            PhotobookSpreadSlot source = sourceSlot.get();
            source.setPhoto(null);
            spreadSlotRepository.saveAndFlush(source);
            targetSlot.setPhoto(photo);
            spreadSlotRepository.saveAndFlush(targetSlot);
            source.setPhoto(displaced);
            spreadSlotRepository.save(source);
        } else {
            // Ảnh đang ở diện "chưa xếp" (không thuộc ô nào) — gán thẳng; ảnh cũ ở ô này (nếu có)
            // tự động rơi về diện chưa xếp vì không còn ô nào tham chiếu tới nó.
            targetSlot.setPhoto(photo);
            spreadSlotRepository.save(targetSlot);
        }

        return toArrangement(project);
    }

    private PhotobookProject owned(UUID userId, UUID projectId) {
        return projectRepository.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_PROJECT_NOT_FOUND, "Photobook project not found"));
    }

    /** Bản sắp xếp chỉ sửa được khi khách đã chốt ảnh nhưng xưởng chưa gửi bản mềm. */
    private void requireArrangementEditable(PhotobookProject project) {
        if (project.getStatus() != PhotobookProjectStatus.PHOTOS_SUBMITTED) {
            throw new AppException(ErrorCode.PHOTOBOOK_ARRANGEMENT_LOCKED,
                    "The draft arrangement can only be changed while the studio hasn't sent a proof yet");
        }
    }

    private PhotobookArrangementResponse toArrangement(PhotobookProject project) {
        List<PhotobookSpread> spreads = spreadRepository.findAllByPhotobookProjectIdOrderByPositionAsc(project.getId());

        List<PhotobookLayoutResponse> layouts = layoutEngine.activeLayouts().stream()
                .map(layout -> new PhotobookLayoutResponse(layout.getCode(), layout.getName(), layoutEngine.slotDefsOf(layout)))
                .toList();

        List<PhotobookSpreadResponse> spreadResponses = spreads.stream()
                .map(spread -> new PhotobookSpreadResponse(
                        spread.getId(),
                        spread.getPosition(),
                        spread.getLayoutCode(),
                        spread.getSlots().stream()
                                .map(slot -> new PhotobookSpreadResponse.Slot(
                                        slot.getId(),
                                        slot.getSlotIndex(),
                                        slot.getPhoto() == null ? null : slot.getPhoto().getId(),
                                        slot.getPhoto() == null ? null
                                                : mediaStorageService.signedPrivateImageUrl(slot.getPhoto().getPublicId()),
                                        slot.getFocalX(),
                                        slot.getFocalY()))
                                .toList()))
                .toList();

        Set<UUID> placedPhotoIds = spreads.stream()
                .flatMap(spread -> spread.getSlots().stream())
                .map(PhotobookSpreadSlot::getPhoto)
                .filter(Objects::nonNull)
                .map(PhotobookProjectPhoto::getId)
                .collect(Collectors.toSet());

        List<PhotobookProjectResponse.PhotobookPhotoResponse> unplaced = project.getPhotos().stream()
                .filter(photo -> !placedPhotoIds.contains(photo.getId()))
                .map(photo -> new PhotobookProjectResponse.PhotobookPhotoResponse(
                        photo.getId(),
                        mediaStorageService.signedPrivateImageUrl(photo.getPublicId()),
                        photo.getOriginalFilename(),
                        photo.getCreatedAt()))
                .toList();

        boolean editable = project.getStatus() == PhotobookProjectStatus.PHOTOS_SUBMITTED;
        return new PhotobookArrangementResponse(project.getId(), editable, layouts, spreadResponses, unplaced);
    }
}
