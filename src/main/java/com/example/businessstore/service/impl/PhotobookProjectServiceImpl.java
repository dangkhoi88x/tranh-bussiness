package com.example.businessstore.service.impl;

import com.example.businessstore.constant.NotificationType;
import com.example.businessstore.constant.PhotobookProjectStatus;
import com.example.businessstore.constant.PhotobookProofDecision;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PhotobookProjectResponse;
import com.example.businessstore.dto.response.PhotobookProofResponse;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.OrderItem;
import com.example.businessstore.entity.PhotobookProject;
import com.example.businessstore.entity.PhotobookProjectPhoto;
import com.example.businessstore.entity.PhotobookProof;
import com.example.businessstore.entity.PhotobookSpread;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookProjectRepository;
import com.example.businessstore.repository.PhotobookSpreadRepository;
import com.example.businessstore.service.MediaStorageService;
import com.example.businessstore.service.MediaTransactionSynchronizer;
import com.example.businessstore.service.NotificationService;
import com.example.businessstore.service.PhotobookProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PhotobookProjectServiceImpl implements PhotobookProjectService {

    /**
     * Bảng giá của xưởng ghi 20 trang → 60–80 hình và 30 trang → 90–120 hình, tức 3–4 ảnh
     * mỗi trang. Quy tắc nằm ở backend để trang sản phẩm và trang gửi ảnh không lệch nhau.
     */
    static final int PHOTOS_PER_PAGE_MIN = 3;
    static final int PHOTOS_PER_PAGE_MAX = 4;

    /** Khách được gửi dư để xưởng chọn, nhưng không phải vô hạn. */
    private static final int PHOTO_HEADROOM = 2;
    private static final int MAX_PAGE_SIZE = 50;

    /** "Sửa miễn phí 2 lần" trong FAQ của xưởng — hết quota thì khách chỉ còn duyệt được. */
    static final int MAX_REVISIONS = 2;

    private final PhotobookProjectRepository projectRepository;
    private final PhotobookSpreadRepository spreadRepository;
    private final PhotobookLayoutEngine layoutEngine;
    private final MediaStorageService mediaStorageService;
    private final MediaTransactionSynchronizer mediaTransactionSynchronizer;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public void openProjectsFor(Order order) {
        for (OrderItem item : order.getItems()) {
            // pageCount khác null chính là dấu hiệu dòng đơn đó là photobook.
            if (item.getPageCount() == null) {
                continue;
            }
            PhotobookProject project = new PhotobookProject();
            project.setOrder(order);
            project.setOrderItem(item);
            project.setUser(order.getUser());
            project.setPageCount(item.getPageCount());
            project.setStatus(PhotobookProjectStatus.AWAITING_PHOTOS);
            projectRepository.save(project);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PhotobookProjectResponse> getMine(UUID userId, int page, int size) {
        Page<PhotobookProject> projects = projectRepository
                .findAllByUserIdOrderByCreatedAtDesc(userId, pageable(page, size));
        return new PageResponse<>(projects.getContent().stream().map(this::toResponse).toList(),
                Math.max(page, 1), projects.getSize(), projects.getTotalElements(),
                projects.getTotalPages(), projects.hasNext());
    }

    @Override
    @Transactional(readOnly = true)
    public PhotobookProjectResponse getMineById(UUID userId, UUID projectId) {
        return toResponse(owned(userId, projectId));
    }

    @Override
    @Transactional
    public PhotobookProjectResponse addPhoto(UUID userId, UUID projectId, MultipartFile file) {
        PhotobookProject project = owned(userId, projectId);
        requireEditable(project);
        if (project.getPhotos().size() >= maxPhotos(project.getPageCount())) {
            throw new AppException(ErrorCode.PHOTOBOOK_PHOTO_LIMIT_REACHED,
                    "This photobook already holds the maximum number of photos");
        }

        MediaStorageService.UploadedMedia uploaded = mediaStorageService.uploadPhotobookPhoto(projectId, file);
        try {
            PhotobookProjectPhoto photo = new PhotobookProjectPhoto();
            photo.setPhotobookProject(project);
            photo.setPublicId(uploaded.publicId());
            photo.setOriginalFilename(normalizeFilename(file.getOriginalFilename()));
            project.getPhotos().add(photo);
            PhotobookProject saved = projectRepository.save(project);
            // Ảnh đã nằm trên Cloudinary trước khi transaction commit; nếu commit hỏng thì
            // phải xoá đi, nếu không kho ảnh sẽ đầy dần những file không ai tham chiếu tới.
            mediaTransactionSynchronizer.deleteCustomOrderImageAfterRollback(uploaded.publicId());
            return toResponse(saved);
        } catch (RuntimeException exception) {
            mediaTransactionSynchronizer.deleteCustomOrderImageQuietly(uploaded.publicId());
            throw exception;
        }
    }

    @Override
    @Transactional
    public PhotobookProjectResponse removePhoto(UUID userId, UUID projectId, UUID photoId) {
        PhotobookProject project = owned(userId, projectId);
        requireEditable(project);
        PhotobookProjectPhoto photo = project.getPhotos().stream()
                .filter(item -> item.getId().equals(photoId))
                .findFirst()
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_PHOTO_NOT_FOUND, "Photo not found"));

        project.getPhotos().remove(photo);
        PhotobookProject saved = projectRepository.save(project);
        // Xoá trên Cloudinary chỉ sau khi DB commit: rollback mà file đã mất là mất ảnh thật của khách.
        mediaTransactionSynchronizer.deleteAfterCommit(photo.getPublicId());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public PhotobookProjectResponse submit(UUID userId, UUID projectId, String customerNote) {
        PhotobookProject project = owned(userId, projectId);
        requireEditable(project);
        int minimum = project.getPageCount() * PHOTOS_PER_PAGE_MIN;
        if (project.getPhotos().size() < minimum) {
            throw new AppException(ErrorCode.PHOTOBOOK_NOT_ENOUGH_PHOTOS,
                    "A " + project.getPageCount() + "-page photobook needs at least " + minimum + " photos");
        }
        project.setCustomerNote(normalizeNote(customerNote));
        project.setStatus(PhotobookProjectStatus.PHOTOS_SUBMITTED);
        project.setSubmittedAt(Instant.now());
        // Storyboard sinh đúng một lần ở đây, trên đúng bộ ảnh vừa khoá — submit() không thể
        // gọi lại lần hai (requireEditable đã chặn), nên không có nguy cơ sinh trùng spread.
        List<PhotobookSpread> spreads = layoutEngine.generateSpreads(project);
        spreadRepository.saveAll(spreads);
        return toResponse(project);
    }

    @Override
    @Transactional
    public PhotobookProjectResponse decideProof(UUID userId, UUID projectId, boolean approved, String customerNote) {
        PhotobookProject project = owned(userId, projectId);
        PhotobookProof proof = pendingProof(project);

        if (approved) {
            proof.setDecision(PhotobookProofDecision.APPROVED);
            proof.setDecidedAt(Instant.now());
            project.setStatus(PhotobookProjectStatus.APPROVED);
            return toResponse(project);
        }

        String note = normalizeNote(customerNote);
        if (note == null) {
            throw new AppException(ErrorCode.PHOTOBOOK_REVISION_NOTE_REQUIRED,
                    "Tell the studio what to change so they can send a new proof");
        }
        if (project.getRevisionCount() >= MAX_REVISIONS) {
            throw new AppException(ErrorCode.PHOTOBOOK_REVISION_LIMIT_REACHED,
                    "This photobook has used its " + MAX_REVISIONS + " free revisions; contact the studio");
        }
        proof.setDecision(PhotobookProofDecision.REVISION_REQUESTED);
        proof.setCustomerNote(note);
        proof.setDecidedAt(Instant.now());
        project.setRevisionCount(project.getRevisionCount() + 1);
        project.setStatus(PhotobookProjectStatus.REVISION_REQUESTED);
        return toResponse(project);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<PhotobookProjectResponse> getForManagement(PhotobookProjectStatus status, int page, int size) {
        Pageable pageable = pageable(page, size);
        Page<PhotobookProject> projects = status == null
                ? projectRepository.findAllByOrderByCreatedAtDesc(pageable)
                : projectRepository.findAllByStatusOrderByCreatedAtDesc(status, pageable);
        return new PageResponse<>(projects.getContent().stream().map(this::toResponse).toList(),
                Math.max(page, 1), projects.getSize(), projects.getTotalElements(),
                projects.getTotalPages(), projects.hasNext());
    }

    @Override
    @Transactional(readOnly = true)
    public PhotobookProjectResponse getForManagementById(UUID projectId) {
        return toResponse(projectRepository.findById(projectId)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_PROJECT_NOT_FOUND, "Photobook project not found")));
    }

    @Override
    @Transactional
    public PhotobookProjectResponse uploadProof(UUID projectId, MultipartFile file, String staffNote) {
        PhotobookProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_PROJECT_NOT_FOUND, "Photobook project not found"));
        // Chỉ gửi bản mềm khi đã có ảnh để layout, và không gửi chồng lên bản khách chưa quyết.
        if (project.getStatus() != PhotobookProjectStatus.PHOTOS_SUBMITTED
                && project.getStatus() != PhotobookProjectStatus.REVISION_REQUESTED) {
            throw new AppException(ErrorCode.PHOTOBOOK_PROOF_NOT_ALLOWED,
                    "A proof can be sent only after the customer submits photos or asks for a revision");
        }

        MediaStorageService.UploadedMedia uploaded = mediaStorageService.uploadPhotobookProof(projectId, file);
        try {
            PhotobookProof proof = new PhotobookProof();
            proof.setPhotobookProject(project);
            proof.setRevision(project.getProofs().size() + 1);
            proof.setPublicId(uploaded.publicId());
            proof.setPageCount(uploaded.pages());
            proof.setSourcePdf(uploaded.pages() > 1 || isPdf(file));
            proof.setStaffNote(normalizeNote(staffNote));
            proof.setDecision(PhotobookProofDecision.PENDING);
            project.getProofs().add(proof);
            project.setStatus(PhotobookProjectStatus.PROOF_SENT);
            PhotobookProject saved = projectRepository.save(project);
            mediaTransactionSynchronizer.deleteCustomOrderImageAfterRollback(uploaded.publicId());
            notifyProofSent(saved, proof.getRevision());
            return toResponse(saved);
        } catch (RuntimeException exception) {
            mediaTransactionSynchronizer.deleteCustomOrderImageQuietly(uploaded.publicId());
            throw exception;
        }
    }

    /**
     * URL từng spread. Với PDF, Cloudinary render trang thành ảnh nên khách lật xem ngay trên
     * trang; với ảnh đơn thì chính nó là spread duy nhất.
     */
    private List<String> proofPageUrls(PhotobookProof proof) {
        if (!proof.isSourcePdf()) {
            return List.of(mediaStorageService.signedPrivateImageUrl(proof.getPublicId()));
        }
        return java.util.stream.IntStream.rangeClosed(1, proof.getPageCount())
                .mapToObj(page -> mediaStorageService.signedPrivatePageUrl(proof.getPublicId(), page))
                .toList();
    }

    private boolean isPdf(MultipartFile file) {
        return file != null && "application/pdf".equalsIgnoreCase(file.getContentType());
    }

    /** Bản mềm mới nhất đang chờ khách quyết định. */
    private PhotobookProof pendingProof(PhotobookProject project) {
        if (project.getStatus() != PhotobookProjectStatus.PROOF_SENT) {
            throw new AppException(ErrorCode.PHOTOBOOK_NO_PENDING_PROOF, "There is no proof waiting for your decision");
        }
        return project.getProofs().stream()
                .filter(proof -> proof.getDecision() == PhotobookProofDecision.PENDING)
                .reduce((first, second) -> second)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_NO_PENDING_PROOF,
                        "There is no proof waiting for your decision"));
    }

    private void notifyProofSent(PhotobookProject project, int revision) {
        notificationService.createIfAbsent(
                project.getUser().getId(),
                NotificationType.PHOTOBOOK_PROOF_SENT,
                "Bản mềm photobook đã sẵn sàng",
                "Xưởng đã gửi bản mềm cho cuốn " + project.getOrderItem().getProductName()
                        + ". Vào duyệt để xưởng chuyển sang in.",
                "/photobook-cua-toi/" + project.getId(),
                "photobook-proof:" + project.getId() + ":" + revision);
    }

    private PhotobookProject owned(UUID userId, UUID projectId) {
        return projectRepository.findByIdAndUserId(projectId, userId)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_PROJECT_NOT_FOUND, "Photobook project not found"));
    }

    /** Chỉ sửa được bộ ảnh trước khi khách chốt; sau đó xưởng đã bắt đầu lên layout. */
    private void requireEditable(PhotobookProject project) {
        if (project.getStatus() != PhotobookProjectStatus.AWAITING_PHOTOS) {
            throw new AppException(ErrorCode.PHOTOBOOK_PROJECT_NOT_EDITABLE,
                    "Photos are locked once you have submitted them to the studio");
        }
    }

    static int maxPhotos(int pageCount) {
        return pageCount * PHOTOS_PER_PAGE_MAX * PHOTO_HEADROOM;
    }

    private PhotobookProjectResponse toResponse(PhotobookProject project) {
        OrderItem item = project.getOrderItem();
        List<PhotobookProjectResponse.PhotobookPhotoResponse> photos = project.getPhotos().stream()
                .map(photo -> new PhotobookProjectResponse.PhotobookPhotoResponse(
                        photo.getId(),
                        mediaStorageService.signedPrivateImageUrl(photo.getPublicId()),
                        photo.getOriginalFilename(),
                        photo.getCreatedAt()))
                .toList();
        return new PhotobookProjectResponse(
                project.getId(),
                project.getOrder().getId(),
                project.getOrder().getOrderCode(),
                item.getId(),
                item.getProductName(),
                item.getProductSlug(),
                item.getVariantName(),
                project.getPageCount(),
                project.getStatus(),
                project.getPageCount() * PHOTOS_PER_PAGE_MIN,
                project.getPageCount() * PHOTOS_PER_PAGE_MAX,
                photos.size(),
                maxPhotos(project.getPageCount()),
                project.getStatus() == PhotobookProjectStatus.AWAITING_PHOTOS,
                project.getCustomerNote(),
                project.getSubmittedAt(),
                project.getRevisionCount(),
                MAX_REVISIONS,
                project.getStatus() == PhotobookProjectStatus.PROOF_SENT,
                photos,
                project.getProofs().stream()
                        .map(proof -> new PhotobookProofResponse(
                                proof.getId(),
                                proof.getRevision(),
                                mediaStorageService.signedPrivateImageUrl(proof.getPublicId()),
                                proof.getPageCount(),
                                proofPageUrls(proof),
                                proof.getStaffNote(),
                                proof.getDecision(),
                                proof.getCustomerNote(),
                                proof.getDecidedAt(),
                                proof.getCreatedAt()))
                        .toList(),
                project.getCreatedAt());
    }

    private Pageable pageable(int page, int size) {
        return PageRequest.of(Math.max(page, 1) - 1, Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
    }

    private String normalizeNote(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String normalizeFilename(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() > 255 ? trimmed.substring(0, 255) : trimmed;
    }
}
