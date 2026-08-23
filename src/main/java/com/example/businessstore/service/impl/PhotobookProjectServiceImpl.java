package com.example.businessstore.service.impl;

import com.example.businessstore.constant.NotificationType;
import com.example.businessstore.constant.PhotobookProjectStatus;
import com.example.businessstore.constant.PhotobookProofDecision;
import com.example.businessstore.dto.response.PageResponse;
import com.example.businessstore.dto.response.PhotobookProjectResponse;
import com.example.businessstore.dto.response.PhotobookProofResponse;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.OrderItem;
import com.example.businessstore.entity.PhotobookDesign;
import com.example.businessstore.entity.PhotobookDesignImage;
import com.example.businessstore.entity.PhotobookProject;
import com.example.businessstore.entity.PhotobookProjectPhoto;
import com.example.businessstore.entity.PhotobookProof;
import com.example.businessstore.entity.PhotobookSpread;
import com.example.businessstore.entity.PhotobookSpreadSlot;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookDesignRepository;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    private final PhotobookDesignRepository photobookDesignRepository;
    private final PhotobookLayoutEngine layoutEngine;
    private final MediaStorageService mediaStorageService;
    private final MediaTransactionSynchronizer mediaTransactionSynchronizer;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper;

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
            project.setTemplateCode(item.getPhotobookTemplateCode());

            PhotobookDesign design = item.getPhotobookDesignId() == null
                    ? null : photobookDesignRepository.findById(item.getPhotobookDesignId()).orElse(null);
            // Đối chiếu lại slug/số trang phòng khi liên kết ở bước thêm giỏ hàng đã lệch —
            // không tin thẳng photobookDesignId dù đã kiểm ở CartServiceImpl.
            if (design != null && design.getProductSlug().equals(item.getProductSlug())
                    && design.getPageCount() == item.getPageCount()) {
                // Không save() project ở đây trước — project chưa có id nên save() bên trong
                // hydrateFromDesign() là persist() thật, cascade đúng các PhotobookProjectPhoto
                // mới thành entity managed cùng instance. Nếu save() project ở đây trước (đã có
                // id), lần save() thứ hai bên trong sẽ thành merge() và trả về bản sao khác —
                // slot vẫn giữ tham chiếu tới ảnh transient cũ, vỡ ràng buộc khi flush.
                hydrateFromDesign(project, design);
            } else {
                project.setStatus(PhotobookProjectStatus.AWAITING_PHOTOS);
                projectRepository.save(project);
            }
        }
    }

    /**
     * Nạp thẳng project từ bản thiết kế đã chốt lúc thêm giỏ hàng: ảnh, layout, crop, caption
     * và màu nền của khách trở thành dữ liệu sản xuất thật, bỏ qua bước AWAITING_PHOTOS/submit()
     * thủ công. Toàn bộ chỉ là ghi DB (ảnh đã upload từ trước, publicId dùng lại trực tiếp) nên
     * chạy gọn trong transaction checkout, không cần bước AFTER_COMMIT hay job bù trừ.
     */
    private void hydrateFromDesign(PhotobookProject project, PhotobookDesign design) {
        // Phải set trước lần save() đầu tiên: spreadRepository.saveAll() bên dưới sẽ tự flush,
        // và flush ghi đúng trạng thái field hiện có trên entity tại lúc đó — set sau sẽ để lại
        // status null trong câu INSERT đầu tiên, vỡ ràng buộc NOT NULL của cột status.
        project.setStatus(PhotobookProjectStatus.PHOTOS_SUBMITTED);
        project.setSubmittedAt(Instant.now());

        Map<String, PhotobookProjectPhoto> photosByKey = new HashMap<>();
        for (PhotobookDesignImage image : design.getImages()) {
            PhotobookProjectPhoto photo = new PhotobookProjectPhoto();
            photo.setPhotobookProject(project);
            photo.setPublicId(image.getPublicId());
            photo.setOriginalFilename(image.getImageKey());
            project.getPhotos().add(photo);
            photosByKey.put(image.getImageKey(), photo);
        }
        projectRepository.save(project);

        JsonNode spreadNodes = objectMapper.readTree(design.getSpreadsJson());
        List<PhotobookSpread> spreads = new ArrayList<>();
        for (JsonNode spreadNode : spreadNodes) {
            PhotobookSpread spread = new PhotobookSpread();
            spread.setPhotobookProject(project);
            spread.setPosition(spreadNode.path("position").asInt());
            spread.setLayoutCode(spreadNode.path("layoutCode").asText());
            spread.setBackgroundColor(textOrDefault(spreadNode, "backgroundColor", "#ffffff"));
            JsonNode captions = spreadNode.get("captions");
            spread.setCaptionsJson(captions == null || !captions.isArray() ? "[]" : captions.toString());

            int slotIndex = 0;
            for (JsonNode slotNode : spreadNode.path("slots")) {
                PhotobookSpreadSlot slot = new PhotobookSpreadSlot();
                slot.setPhotobookSpread(spread);
                slot.setSlotIndex(slotIndex++);
                JsonNode imageId = slotNode.get("imageId");
                if (imageId != null && !imageId.isNull()) {
                    slot.setPhoto(photosByKey.get(imageId.asText()));
                }
                double zoom = clamp(slotNode.path("zoom").asDouble(1.0), 1.0, 3.0);
                double panX = clamp(slotNode.path("panX").asDouble(0.0), -1.0, 1.0);
                double panY = clamp(slotNode.path("panY").asDouble(0.0), -1.0, 1.0);
                slot.setZoom(scale(zoom, 2));
                slot.setFocalX(scale(0.5 + panX / 2, 3));
                slot.setFocalY(scale(0.5 + panY / 2, 3));
                spread.getSlots().add(slot);
            }
            spreads.add(spread);
        }
        spreadRepository.saveAll(spreads);
    }

    private String textOrDefault(JsonNode node, String field, String fallback) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() || !value.isTextual() || value.asText().isBlank()
                ? fallback : value.asText();
    }

    private double clamp(double value, double min, double max) {
        return Math.min(Math.max(value, min), max);
    }

    private BigDecimal scale(double value, int digits) {
        return BigDecimal.valueOf(value).setScale(digits, RoundingMode.HALF_UP);
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
                    "Cuốn photobook này đã đạt số ảnh tối đa.");
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
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_PHOTO_NOT_FOUND, "Không tìm thấy ảnh."));

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
                    "Cuốn photobook " + project.getPageCount() + " trang cần ít nhất " + minimum + " ảnh.");
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
                    "Hãy nêu rõ chỗ cần sửa để xưởng gửi lại bản mềm mới.");
        }
        if (project.getRevisionCount() >= MAX_REVISIONS) {
            throw new AppException(ErrorCode.PHOTOBOOK_REVISION_LIMIT_REACHED,
                    "Cuốn photobook này đã dùng hết " + MAX_REVISIONS + " lượt chỉnh sửa miễn phí; vui lòng liên hệ xưởng.");
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
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_PROJECT_NOT_FOUND, "Không tìm thấy cuốn photobook.")));
    }

    @Override
    @Transactional
    public PhotobookProjectResponse uploadProof(UUID projectId, MultipartFile file, String staffNote) {
        PhotobookProject project = projectRepository.findById(projectId)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_PROJECT_NOT_FOUND, "Không tìm thấy cuốn photobook."));
        // Chỉ gửi bản mềm khi đã có ảnh để layout, và không gửi chồng lên bản khách chưa quyết.
        if (project.getStatus() != PhotobookProjectStatus.PHOTOS_SUBMITTED
                && project.getStatus() != PhotobookProjectStatus.REVISION_REQUESTED) {
            throw new AppException(ErrorCode.PHOTOBOOK_PROOF_NOT_ALLOWED,
                    "Chỉ gửi được bản mềm sau khi khách đã gửi ảnh hoặc yêu cầu chỉnh sửa.");
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
            throw new AppException(ErrorCode.PHOTOBOOK_NO_PENDING_PROOF, "Không có bản mềm nào đang chờ bạn duyệt.");
        }
        return project.getProofs().stream()
                .filter(proof -> proof.getDecision() == PhotobookProofDecision.PENDING)
                .reduce((first, second) -> second)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_NO_PENDING_PROOF,
                        "Không có bản mềm nào đang chờ bạn duyệt."));
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
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_PROJECT_NOT_FOUND, "Không tìm thấy cuốn photobook."));
    }

    /** Chỉ sửa được bộ ảnh trước khi khách chốt; sau đó xưởng đã bắt đầu lên layout. */
    private void requireEditable(PhotobookProject project) {
        if (project.getStatus() != PhotobookProjectStatus.AWAITING_PHOTOS) {
            throw new AppException(ErrorCode.PHOTOBOOK_PROJECT_NOT_EDITABLE,
                    "Ảnh đã gửi cho xưởng thì không sửa được nữa.");
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
