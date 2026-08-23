package com.example.businessstore.service.impl;

import com.example.businessstore.constant.PhotobookProjectStatus;
import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.PhotobookLayout;
import com.example.businessstore.entity.PhotobookProject;
import com.example.businessstore.entity.PhotobookProjectPhoto;
import com.example.businessstore.entity.PhotobookSpread;
import com.example.businessstore.entity.PhotobookSpreadSlot;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookProjectRepository;
import com.example.businessstore.repository.PhotobookSpreadRepository;
import com.example.businessstore.repository.PhotobookSpreadSlotRepository;
import com.example.businessstore.service.MediaStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PhotobookArrangementServiceImplTest {

    @Mock private PhotobookProjectRepository projectRepository;
    @Mock private PhotobookSpreadRepository spreadRepository;
    @Mock private PhotobookSpreadSlotRepository spreadSlotRepository;
    @Mock private PhotobookLayoutEngine layoutEngine;
    @Mock private MediaStorageService mediaStorageService;
    @InjectMocks private PhotobookArrangementServiceImpl service;

    private final UUID userId = UUID.randomUUID();
    private PhotobookProject project;
    private PhotobookProjectPhoto photoA;
    private PhotobookProjectPhoto photoB;
    private PhotobookProjectPhoto photoC;

    @BeforeEach
    void setUp() {
        User user = new User();
        user.setId(userId);
        Order order = new Order();
        order.setId(UUID.randomUUID());

        project = new PhotobookProject();
        project.setId(UUID.randomUUID());
        project.setUser(user);
        project.setOrder(order);
        project.setPageCount(20);
        project.setStatus(PhotobookProjectStatus.PHOTOS_SUBMITTED);

        photoA = photo("a");
        photoB = photo("b");
        photoC = photo("c");
        project.getPhotos().add(photoA);
        project.getPhotos().add(photoB);
        project.getPhotos().add(photoC);

        when(projectRepository.findByIdAndUserId(project.getId(), userId)).thenReturn(Optional.of(project));
        when(mediaStorageService.signedPrivateImageUrl(any())).thenReturn("https://signed.example/photo");
        when(layoutEngine.activeLayouts()).thenReturn(List.of());
        when(spreadRepository.findAllByPhotobookProjectIdOrderByPositionAsc(project.getId())).thenReturn(List.of());
        // save/saveAndFlush trả về chính đối tượng nhận vào, giống hành vi thật của Spring Data.
        when(spreadSlotRepository.save(any())).thenAnswer(call -> call.getArgument(0));
        when(spreadSlotRepository.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        when(spreadRepository.save(any())).thenAnswer(call -> call.getArgument(0));
    }

    private PhotobookProjectPhoto photo(String tag) {
        PhotobookProjectPhoto photo = new PhotobookProjectPhoto();
        photo.setId(UUID.randomUUID());
        photo.setPublicId("photo-" + tag);
        return photo;
    }

    private PhotobookSpreadSlot slot(UUID id, PhotobookProjectPhoto photo) {
        PhotobookSpreadSlot slot = new PhotobookSpreadSlot();
        slot.setId(id);
        slot.setPhoto(photo);
        return slot;
    }

    /* ── Quyền hạn & vòng đời ── */

    @Test
    void getArrangement_requiresSpreadsToAlreadyBeGenerated() {
        when(spreadRepository.existsByPhotobookProjectId(project.getId())).thenReturn(false);

        assertThatThrownBy(() -> service.getArrangement(userId, project.getId()))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_ARRANGEMENT_NOT_READY));
    }

    @Test
    void getArrangement_rejectsAnotherCustomersProject() {
        UUID stranger = UUID.randomUUID();
        when(projectRepository.findByIdAndUserId(project.getId(), stranger)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getArrangement(stranger, project.getId()))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_PROJECT_NOT_FOUND));
    }

    @Test
    void assignPhoto_isLockedOnceTheStudioHasSentAProof() {
        project.setStatus(PhotobookProjectStatus.PROOF_SENT);

        assertThatThrownBy(() -> service.assignPhoto(userId, project.getId(), UUID.randomUUID(), photoA.getId()))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_ARRANGEMENT_LOCKED));
    }

    /* ── Đổi archetype của một spread ── */

    @Test
    void changeSpreadLayout_deletesAndFlushesBeforeInsertingTheNewSlots() {
        UUID spreadId = UUID.randomUUID();
        PhotobookSpread spread = new PhotobookSpread();
        spread.setId(spreadId);
        spread.setPhotobookProject(project);
        spread.setLayoutCode("CONTACT_SHEET");
        PhotobookSpreadSlot oldSlot = slot(UUID.randomUUID(), photoA);
        spread.getSlots().add(oldSlot);

        PhotobookLayout tranDoi = new PhotobookLayout();
        tranDoi.setCode("TRAN_DOI");
        PhotobookSpreadSlot newSlot = new PhotobookSpreadSlot();
        newSlot.setSlotIndex(0);
        newSlot.setPhoto(photoA);

        when(spreadRepository.findByIdAndPhotobookProjectIdAndPhotobookProjectUserId(spreadId, project.getId(), userId))
                .thenReturn(Optional.of(spread));
        when(layoutEngine.requireLayout("TRAN_DOI")).thenReturn(tranDoi);
        when(layoutEngine.rebuildSlots(spread, tranDoi)).thenReturn(List.of(newSlot));

        service.changeSpreadLayout(userId, project.getId(), spreadId, "TRAN_DOI");

        // Xoá ô cũ và flush phải xảy ra trước khi lưu spread với ô mới — layout mới có thể
        // dùng lại đúng slot_index của layout cũ, nên thứ tự sai sẽ đụng ràng buộc unique thật.
        InOrder order = inOrder(spreadSlotRepository, spreadRepository);
        order.verify(spreadSlotRepository).deleteAll(List.of(oldSlot));
        order.verify(spreadSlotRepository).flush();
        order.verify(spreadRepository).save(spread);

        assertThat(spread.getLayoutCode()).isEqualTo("TRAN_DOI");
        assertThat(spread.getSlots()).containsExactly(newSlot);
    }

    @Test
    void changeSpreadLayout_isLockedOnceTheStudioHasSentAProof() {
        project.setStatus(PhotobookProjectStatus.PROOF_SENT);
        UUID spreadId = UUID.randomUUID();
        PhotobookSpread spread = new PhotobookSpread();
        spread.setId(spreadId);
        spread.setPhotobookProject(project);
        when(spreadRepository.findByIdAndPhotobookProjectIdAndPhotobookProjectUserId(spreadId, project.getId(), userId))
                .thenReturn(Optional.of(spread));

        assertThatThrownBy(() -> service.changeSpreadLayout(userId, project.getId(), spreadId, "TRAN_DOI"))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_ARRANGEMENT_LOCKED));
    }

    /* ── Gán ảnh vào ô: hoán vị ── */

    @Test
    void assignPhoto_placesAnUnplacedPhotoIntoAnEmptySlot() {
        UUID slotId = UUID.randomUUID();
        PhotobookSpreadSlot target = slot(slotId, null);
        when(spreadSlotRepository.findByIdAndPhotobookSpreadPhotobookProjectIdAndPhotobookSpreadPhotobookProjectUserId(
                slotId, project.getId(), userId)).thenReturn(Optional.of(target));
        when(spreadSlotRepository.findByPhotobookSpreadPhotobookProjectIdAndPhotoId(project.getId(), photoA.getId()))
                .thenReturn(Optional.empty());

        service.assignPhoto(userId, project.getId(), slotId, photoA.getId());

        assertThat(target.getPhoto()).isEqualTo(photoA);
        verify(spreadSlotRepository).save(target);
        // Không có ô nguồn nào bị đụng tới vì ảnh đang ở diện "chưa xếp".
        verify(spreadSlotRepository, never()).saveAndFlush(any());
    }

    @Test
    void assignPhoto_swapsWithWhicheverSlotAlreadyHoldsThatPhoto() {
        UUID targetId = UUID.randomUUID();
        UUID sourceId = UUID.randomUUID();
        PhotobookSpreadSlot target = slot(targetId, photoB); // ô đích đang có ảnh B
        PhotobookSpreadSlot source = slot(sourceId, photoA); // ảnh A đang ở ô khác

        when(spreadSlotRepository.findByIdAndPhotobookSpreadPhotobookProjectIdAndPhotobookSpreadPhotobookProjectUserId(
                targetId, project.getId(), userId)).thenReturn(Optional.of(target));
        when(spreadSlotRepository.findByPhotobookSpreadPhotobookProjectIdAndPhotoId(project.getId(), photoA.getId()))
                .thenReturn(Optional.of(source));

        service.assignPhoto(userId, project.getId(), targetId, photoA.getId());

        // Thả A vào ô đang có B: A chuyển tới ô đích, B chuyển ngược về đúng ô cũ của A.
        assertThat(target.getPhoto()).isEqualTo(photoA);
        assertThat(source.getPhoto()).isEqualTo(photoB);

        // Ô nguồn phải được dọn trống và flush TRƯỚC KHI ô đích nhận ảnh A — nếu không, có lúc
        // cả hai ô cùng tham chiếu ảnh A, đụng ràng buộc unique một phần trên photo_id.
        InOrder order = inOrder(spreadSlotRepository);
        order.verify(spreadSlotRepository).saveAndFlush(source); // source.photo = null
        order.verify(spreadSlotRepository).saveAndFlush(target); // target.photo = A
        order.verify(spreadSlotRepository).save(source);         // source.photo = B (displaced)
    }

    @Test
    void assignPhoto_clearingASlotReturnsItsPhotoToTheUnplacedPool() {
        UUID slotId = UUID.randomUUID();
        PhotobookSpreadSlot target = slot(slotId, photoA);
        when(spreadSlotRepository.findByIdAndPhotobookSpreadPhotobookProjectIdAndPhotobookSpreadPhotobookProjectUserId(
                slotId, project.getId(), userId)).thenReturn(Optional.of(target));

        service.assignPhoto(userId, project.getId(), slotId, null);

        assertThat(target.getPhoto()).isNull();
        verify(spreadSlotRepository).save(target);
    }

    @Test
    void assignPhoto_isANoOpWhenThePhotoIsAlreadyInThatSlot() {
        UUID slotId = UUID.randomUUID();
        PhotobookSpreadSlot target = slot(slotId, photoA);
        when(spreadSlotRepository.findByIdAndPhotobookSpreadPhotobookProjectIdAndPhotobookSpreadPhotobookProjectUserId(
                slotId, project.getId(), userId)).thenReturn(Optional.of(target));

        service.assignPhoto(userId, project.getId(), slotId, photoA.getId());

        verify(spreadSlotRepository, never()).save(any());
        verify(spreadSlotRepository, never()).saveAndFlush(any());
    }

    @Test
    void assignPhoto_rejectsAPhotoThatDoesNotBelongToThisProject() {
        UUID slotId = UUID.randomUUID();
        UUID foreignPhotoId = UUID.randomUUID();
        PhotobookSpreadSlot target = slot(slotId, null);
        when(spreadSlotRepository.findByIdAndPhotobookSpreadPhotobookProjectIdAndPhotobookSpreadPhotobookProjectUserId(
                slotId, project.getId(), userId)).thenReturn(Optional.of(target));

        assertThatThrownBy(() -> service.assignPhoto(userId, project.getId(), slotId, foreignPhotoId))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_PHOTO_NOT_IN_PROJECT));
    }

    @Test
    void assignPhoto_rejectsAnUnknownSlot() {
        UUID slotId = UUID.randomUUID();
        when(spreadSlotRepository.findByIdAndPhotobookSpreadPhotobookProjectIdAndPhotobookSpreadPhotobookProjectUserId(
                slotId, project.getId(), userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.assignPhoto(userId, project.getId(), slotId, photoA.getId()))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.PHOTOBOOK_SLOT_NOT_FOUND));
    }
}
