package com.example.businessstore.service.impl;

import com.example.businessstore.constant.NotificationType;
import com.example.businessstore.constant.PhotobookProjectStatus;
import com.example.businessstore.constant.PhotobookProofDecision;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.OrderItem;
import com.example.businessstore.entity.PhotobookDesign;
import com.example.businessstore.entity.PhotobookDesignImage;
import com.example.businessstore.entity.PhotobookProject;
import com.example.businessstore.entity.PhotobookProjectPhoto;
import com.example.businessstore.entity.PhotobookProof;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookDesignRepository;
import com.example.businessstore.repository.PhotobookProjectRepository;
import com.example.businessstore.service.MediaStorageService;
import com.example.businessstore.service.MediaTransactionSynchronizer;
import com.example.businessstore.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageImpl;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PhotobookProjectServiceImplTest {

    @Mock private PhotobookProjectRepository projectRepository;
    @Mock private com.example.businessstore.repository.PhotobookSpreadRepository spreadRepository;
    @Mock private PhotobookDesignRepository photobookDesignRepository;
    @Mock private PhotobookLayoutEngine layoutEngine;
    @Mock private MediaStorageService mediaStorageService;
    @Mock private MediaTransactionSynchronizer mediaTransactionSynchronizer;
    @Mock private NotificationService notificationService;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks private PhotobookProjectServiceImpl service;

    private final UUID userId = UUID.randomUUID();
    private PhotobookProject project;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(userId);

        Order order = new Order();
        order.setId(UUID.randomUUID());
        order.setOrderCode("ART-TEST-0001");
        order.setUser(user);

        OrderItem item = new OrderItem();
        item.setId(UUID.randomUUID());
        item.setProductName("Photobook Eco Matte");
        item.setProductSlug("photobook-eco-matte");
        item.setVariantName("Size M (20 × 25 cm)");
        item.setPageCount(20);

        project = new PhotobookProject();
        project.setId(UUID.randomUUID());
        project.setOrder(order);
        project.setOrderItem(item);
        project.setUser(user);
        project.setPageCount(20);
        project.setStatus(PhotobookProjectStatus.AWAITING_PHOTOS);

        when(projectRepository.findByIdAndUserId(project.getId(), userId)).thenReturn(Optional.of(project));
        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(projectRepository.save(any(PhotobookProject.class))).thenAnswer(call -> call.getArgument(0));
        when(mediaStorageService.signedPrivateImageUrl(any())).thenReturn("https://signed.example/asset");
    }

    private void fillPhotos(int count) {
        for (int index = 0; index < count; index++) {
            PhotobookProjectPhoto photo = new PhotobookProjectPhoto();
            photo.setId(UUID.randomUUID());
            photo.setPhotobookProject(project);
            photo.setPublicId("public-" + index);
            project.getPhotos().add(photo);
        }
    }

    /** Xưởng gửi bản mềm kế tiếp (một ảnh đơn); trả về chính bản vừa gửi. */
    private PhotobookProof sendProof() {
        when(mediaStorageService.uploadPhotobookProof(any(), any())).thenReturn(
                new MediaStorageService.UploadedMedia("proof-" + project.getProofs().size(), "https://x"));
        service.uploadProof(project.getId(), null, "Bản mềm lần này đã đổi bìa");
        return project.getProofs().getLast();
    }

    /** Bản mềm dạng PDF nhiều spread — đây là dạng xưởng gửi trong thực tế. */
    private PhotobookProof sendPdfProof(int spreads) {
        when(mediaStorageService.uploadPhotobookProof(any(), any())).thenReturn(
                new MediaStorageService.UploadedMedia("proof-pdf", "https://x", spreads));
        when(mediaStorageService.signedPrivatePageUrl(any(), org.mockito.ArgumentMatchers.anyInt()))
                .thenAnswer(call -> "https://signed.example/page-" + call.getArgument(1));
        service.uploadProof(project.getId(), null, null);
        return project.getProofs().getLast();
    }

    /* ── Bước 3: bộ ảnh khách gửi ── */

    @Test
    void openProjectsFor_onlyOpensProjectsForPhotobookLines() {
        Order order = project.getOrder();
        OrderItem canvas = new OrderItem();
        canvas.setId(UUID.randomUUID());
        canvas.setProductName("Miền nhớ Đà Lạt");
        canvas.setPageCount(null);
        order.getItems().add(project.getOrderItem());
        order.getItems().add(canvas);

        service.openProjectsFor(order);

        ArgumentCaptor<PhotobookProject> saved = ArgumentCaptor.forClass(PhotobookProject.class);
        verify(projectRepository).save(saved.capture());
        assertThat(saved.getValue().getOrderItem().getProductName()).isEqualTo("Photobook Eco Matte");
        assertThat(saved.getValue().getPageCount()).isEqualTo(20);
        assertThat(saved.getValue().getStatus()).isEqualTo(PhotobookProjectStatus.AWAITING_PHOTOS);
    }

    @Test
    void openProjectsFor_hydratesSpreadsAndPhotosFromALinkedDesign() {
        UUID designId = UUID.randomUUID();
        project.getOrderItem().setPhotobookDesignId(designId);
        Order order = project.getOrder();
        order.getItems().add(project.getOrderItem());

        PhotobookDesign design = new PhotobookDesign();
        design.setId(designId);
        design.setProductSlug("photobook-eco-matte");
        design.setPageCount(20);
        PhotobookDesignImage image = new PhotobookDesignImage();
        image.setDesign(design);
        image.setImageKey("img-1");
        image.setPublicId("business-store/photobook-designs/" + designId + "/abc");
        design.getImages().add(image);
        design.setSpreadsJson("""
                [{"position":1,"layoutCode":"TRAN_DOI","backgroundColor":"#111111",
                  "captions":[{"id":"c1","text":"He 2024"}],
                  "slots":[{"imageId":"img-1","zoom":2.0,"panX":1.0,"panY":-1.0}]}]
                """);

        when(photobookDesignRepository.findById(designId)).thenReturn(Optional.of(design));
        when(spreadRepository.saveAll(any())).thenAnswer(call -> call.getArgument(0));

        // openProjectsFor tạo một PhotobookProject mới bên trong nó (khác với "project" của
        // fixture @BeforeEach, vốn chỉ được dùng để dựng sẵn Order/OrderItem) — phải bắt lại
        // đúng đối tượng đã lưu để kiểm tra kết quả hydrate.
        service.openProjectsFor(order);

        ArgumentCaptor<PhotobookProject> projectCaptor = ArgumentCaptor.forClass(PhotobookProject.class);
        verify(projectRepository, org.mockito.Mockito.atLeastOnce()).save(projectCaptor.capture());
        PhotobookProject hydrated = projectCaptor.getValue();

        assertThat(hydrated.getStatus()).isEqualTo(PhotobookProjectStatus.PHOTOS_SUBMITTED);
        assertThat(hydrated.getSubmittedAt()).isNotNull();
        assertThat(hydrated.getPhotos()).singleElement()
                .satisfies(photo -> assertThat(photo.getPublicId()).isEqualTo(image.getPublicId()));

        ArgumentCaptor<List<com.example.businessstore.entity.PhotobookSpread>> captor = ArgumentCaptor.forClass(List.class);
        verify(spreadRepository).saveAll(captor.capture());
        var spread = captor.getValue().getFirst();
        assertThat(spread.getLayoutCode()).isEqualTo("TRAN_DOI");
        assertThat(spread.getBackgroundColor()).isEqualTo("#111111");
        assertThat(spread.getCaptionsJson()).contains("He 2024");
        var slot = spread.getSlots().getFirst();
        assertThat(slot.getPhoto().getPublicId()).isEqualTo(image.getPublicId());
        // zoom clamped to 3.00 max; panX/panY clamped to ±1 -> focal 1.000/0.000.
        assertThat(slot.getZoom()).isEqualByComparingTo("2.00");
        assertThat(slot.getFocalX()).isEqualByComparingTo("1.000");
        assertThat(slot.getFocalY()).isEqualByComparingTo("0.000");
    }

    @Test
    void openProjectsFor_fallsBackToAwaitingPhotosWhenDesignDoesNotMatchTheOrderLine() {
        UUID designId = UUID.randomUUID();
        project.getOrderItem().setPhotobookDesignId(designId);
        Order order = project.getOrder();
        order.getItems().add(project.getOrderItem());

        PhotobookDesign design = new PhotobookDesign();
        design.setId(designId);
        design.setProductSlug("a-different-photobook");
        design.setPageCount(20);
        when(photobookDesignRepository.findById(designId)).thenReturn(Optional.of(design));

        service.openProjectsFor(order);

        ArgumentCaptor<PhotobookProject> projectCaptor = ArgumentCaptor.forClass(PhotobookProject.class);
        verify(projectRepository).save(projectCaptor.capture());
        assertThat(projectCaptor.getValue().getStatus()).isEqualTo(PhotobookProjectStatus.AWAITING_PHOTOS);
        assertThat(projectCaptor.getValue().getPhotos()).isEmpty();
        verify(spreadRepository, never()).saveAll(any());
    }

    @Test
    void response_derivesThePhotoTargetFromThePageCount() {
        fillPhotos(12);

        var response = service.getMineById(userId, project.getId());

        // Bảng giá: 20 trang → 60–80 hình.
        assertThat(response.recommendedPhotosMin()).isEqualTo(60);
        assertThat(response.recommendedPhotosMax()).isEqualTo(80);
        assertThat(response.photoCount()).isEqualTo(12);
        assertThat(response.maxPhotos()).isEqualTo(160);
        assertThat(response.editable()).isTrue();
    }

    @Test
    void submit_requiresTheMinimumPhotoCountForThePageCount() {
        fillPhotos(59);

        assertThatThrownBy(() -> service.submit(userId, project.getId(), null))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_NOT_ENOUGH_PHOTOS));
        assertThat(project.getStatus()).isEqualTo(PhotobookProjectStatus.AWAITING_PHOTOS);
    }

    @Test
    void submit_locksThePhotoSetOnceTheStudioHasIt() {
        fillPhotos(60);

        var response = service.submit(userId, project.getId(), "  Ảnh cưới, xin xếp theo ngày  ");

        assertThat(response.status()).isEqualTo(PhotobookProjectStatus.PHOTOS_SUBMITTED);
        assertThat(response.editable()).isFalse();
        assertThat(response.customerNote()).isEqualTo("Ảnh cưới, xin xếp theo ngày");
        assertThat(project.getSubmittedAt()).isNotNull();

        assertThatThrownBy(() -> service.addPhoto(userId, project.getId(), null))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_PROJECT_NOT_EDITABLE));
        verify(mediaStorageService, never()).uploadPhotobookPhoto(any(), any());
    }

    @Test
    void addPhoto_stopsAtTheStorageCeiling() {
        fillPhotos(PhotobookProjectServiceImpl.maxPhotos(20));

        assertThatThrownBy(() -> service.addPhoto(userId, project.getId(), null))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_PHOTO_LIMIT_REACHED));
        verify(mediaStorageService, never()).uploadPhotobookPhoto(any(), any());
    }

    @Test
    void removePhoto_deletesTheFileOnlyAfterTheDatabaseCommits() {
        fillPhotos(3);
        PhotobookProjectPhoto target = project.getPhotos().get(1);

        var response = service.removePhoto(userId, project.getId(), target.getId());

        assertThat(response.photoCount()).isEqualTo(2);
        // Xoá trước khi commit là mất ảnh gốc của khách nếu transaction rollback.
        verify(mediaTransactionSynchronizer).deleteAfterCommit(target.getPublicId());
    }

    @Test
    void removePhoto_rejectsAPhotoFromAnotherProject() {
        fillPhotos(2);

        assertThatThrownBy(() -> service.removePhoto(userId, project.getId(), UUID.randomUUID()))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_PHOTO_NOT_FOUND));
    }

    @Test
    void anotherCustomerCannotOpenTheProject() {
        UUID stranger = UUID.randomUUID();
        when(projectRepository.findByIdAndUserId(project.getId(), stranger)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getMineById(stranger, project.getId()))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_PROJECT_NOT_FOUND));
    }

    @Test
    void photosAreServedThroughSignedUrlsOnly() {
        fillPhotos(1);

        var response = service.getMineById(userId, project.getId());

        assertThat(response.photos()).singleElement()
                .satisfies(photo -> assertThat(photo.url()).isEqualTo("https://signed.example/asset"));
        verify(mediaStorageService).signedPrivateImageUrl("public-0");
    }

    @Test
    void listReturnsProjectsOfTheSignedInCustomerOnly() {
        when(projectRepository.findAllByUserIdOrderByCreatedAtDesc(any(), any()))
                .thenReturn(new PageImpl<>(List.of(project)));

        var page = service.getMine(userId, 1, 10);

        assertThat(page.items()).singleElement()
                .satisfies(item -> assertThat(item.orderCode()).isEqualTo("ART-TEST-0001"));
        verify(projectRepository).findAllByUserIdOrderByCreatedAtDesc(eq(userId), any());
    }

    /* ── Bước 4: duyệt bản mềm ── */

    @Test
    void uploadProof_onlyAfterTheCustomerHasSubmittedPhotos() {
        project.setStatus(PhotobookProjectStatus.AWAITING_PHOTOS);

        assertThatThrownBy(() -> service.uploadProof(project.getId(), null, null))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_PROOF_NOT_ALLOWED));
        verify(mediaStorageService, never()).uploadPhotobookProof(any(), any());
    }

    @Test
    void uploadProof_numbersRevisionsAndNotifiesTheCustomer() {
        project.setStatus(PhotobookProjectStatus.PHOTOS_SUBMITTED);

        PhotobookProof first = sendProof();

        assertThat(first.getRevision()).isEqualTo(1);
        assertThat(first.getDecision()).isEqualTo(PhotobookProofDecision.PENDING);
        assertThat(project.getStatus()).isEqualTo(PhotobookProjectStatus.PROOF_SENT);
        verify(notificationService).createIfAbsent(eq(userId), eq(NotificationType.PHOTOBOOK_PROOF_SENT),
                any(), any(), eq("/photobook-cua-toi/" + project.getId()),
                eq("photobook-proof:" + project.getId() + ":1"));
    }

    @Test
    void approvingTheProofMovesTheBookToPrinting() {
        project.setStatus(PhotobookProjectStatus.PHOTOS_SUBMITTED);
        PhotobookProof proof = sendProof();

        var response = service.decideProof(userId, project.getId(), true, null);

        assertThat(response.status()).isEqualTo(PhotobookProjectStatus.APPROVED);
        assertThat(proof.getDecision()).isEqualTo(PhotobookProofDecision.APPROVED);
        assertThat(proof.getDecidedAt()).isNotNull();
        assertThat(response.awaitingDecision()).isFalse();
    }

    @Test
    void requestingARevisionNeedsToSayWhatToChange() {
        project.setStatus(PhotobookProjectStatus.PHOTOS_SUBMITTED);
        sendProof();

        assertThatThrownBy(() -> service.decideProof(userId, project.getId(), false, "   "))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_REVISION_NOTE_REQUIRED));
        assertThat(project.getStatus()).isEqualTo(PhotobookProjectStatus.PROOF_SENT);
    }

    @Test
    void theStudioGrantsExactlyTwoFreeRevisions() {
        project.setStatus(PhotobookProjectStatus.PHOTOS_SUBMITTED);

        sendProof();
        service.decideProof(userId, project.getId(), false, "Đổi ảnh bìa");
        assertThat(project.getRevisionCount()).isEqualTo(1);
        assertThat(project.getStatus()).isEqualTo(PhotobookProjectStatus.REVISION_REQUESTED);

        sendProof();
        service.decideProof(userId, project.getId(), false, "Xếp lại trang 4");
        assertThat(project.getRevisionCount()).isEqualTo(2);

        // Lần thứ ba vượt chính sách "sửa miễn phí 2 lần" — khách chỉ còn duyệt được.
        sendProof();
        assertThatThrownBy(() -> service.decideProof(userId, project.getId(), false, "Sửa thêm lần nữa"))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_REVISION_LIMIT_REACHED));

        var approved = service.decideProof(userId, project.getId(), true, null);
        assertThat(approved.status()).isEqualTo(PhotobookProjectStatus.APPROVED);
        assertThat(approved.revisionCount()).isEqualTo(2);
        assertThat(approved.maxRevisions()).isEqualTo(PhotobookProjectServiceImpl.MAX_REVISIONS);
        assertThat(approved.proofs()).hasSize(3);
    }

    @Test
    void aPdfProofBecomesOneImageUrlPerSpread() {
        project.setStatus(PhotobookProjectStatus.PHOTOS_SUBMITTED);

        PhotobookProof proof = sendPdfProof(15);

        assertThat(proof.getPageCount()).isEqualTo(15);
        assertThat(proof.isSourcePdf()).isTrue();

        var response = service.getMineById(userId, project.getId());
        var latest = response.proofs().getLast();
        // Khách lật từng spread ngay trên trang thay vì phải tải cả file PDF về.
        assertThat(latest.pageCount()).isEqualTo(15);
        assertThat(latest.pageUrls()).hasSize(15)
                .startsWith("https://signed.example/page-1")
                .endsWith("https://signed.example/page-15");
    }

    @Test
    void aSingleImageProofStillHasExactlyOneSpread() {
        project.setStatus(PhotobookProjectStatus.PHOTOS_SUBMITTED);

        PhotobookProof proof = sendProof();

        assertThat(proof.getPageCount()).isEqualTo(1);
        assertThat(proof.isSourcePdf()).isFalse();

        var latest = service.getMineById(userId, project.getId()).proofs().getLast();
        assertThat(latest.pageUrls()).containsExactly("https://signed.example/asset");
        // Ảnh đơn không đi qua transformation trang.
        verify(mediaStorageService, never()).signedPrivatePageUrl(any(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void decidingWithoutAPendingProofIsRejected() {
        assertThatThrownBy(() -> service.decideProof(userId, project.getId(), true, null))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_NO_PENDING_PROOF));
    }
}
