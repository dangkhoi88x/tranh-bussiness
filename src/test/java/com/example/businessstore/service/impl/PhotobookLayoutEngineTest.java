package com.example.businessstore.service.impl;

import com.example.businessstore.entity.Order;
import com.example.businessstore.entity.PhotobookLayout;
import com.example.businessstore.entity.PhotobookProject;
import com.example.businessstore.entity.PhotobookProjectPhoto;
import com.example.businessstore.entity.PhotobookSpread;
import com.example.businessstore.entity.PhotobookSpreadSlot;
import com.example.businessstore.entity.PhotobookTemplate;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.repository.PhotobookLayoutRepository;
import com.example.businessstore.repository.PhotobookTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Bốn archetype của bộ đầu tiên: TRAN_DOI (1 ô tràn), DOI_CAN (2 ô bằng nhau), KHOI_MAU (0 ô —
 * ngắt chương), CONTACT_SHEET (12 ô). Chu kỳ mặc định trong V43:
 * [TRAN_DOI, DOI_CAN, CONTACT_SHEET, TRAN_DOI, DOI_CAN, KHOI_MAU, CONTACT_SHEET, DOI_CAN].
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PhotobookLayoutEngineTest {

    @Mock private PhotobookLayoutRepository layoutRepository;
    @Mock private PhotobookTemplateRepository templateRepository;
    @InjectMocks private PhotobookLayoutEngine engine;

    private PhotobookLayout tranDoi;
    private PhotobookLayout doiCan;
    private PhotobookLayout khoiMau;
    private PhotobookLayout contactSheet;

    @BeforeEach
    void setUp() {
        engine = new PhotobookLayoutEngine(layoutRepository, templateRepository, new ObjectMapper());

        tranDoi = layout("TRAN_DOI", "[{\"x\":0,\"y\":0,\"w\":1,\"h\":1,\"bleed\":true}]");
        doiCan = layout("DOI_CAN",
                "[{\"x\":0.06,\"y\":0.08,\"w\":0.38,\"h\":0.84,\"bleed\":false}," +
                        "{\"x\":0.56,\"y\":0.08,\"w\":0.38,\"h\":0.84,\"bleed\":false}]");
        khoiMau = layout("KHOI_MAU", "[]");
        contactSheet = layout("CONTACT_SHEET", contactSheetSlotsJson());

        when(layoutRepository.findAllByActiveTrueOrderBySortOrderAsc())
                .thenReturn(List.of(tranDoi, doiCan, khoiMau, contactSheet));
        when(layoutRepository.findByCodeAndActiveTrue("TRAN_DOI")).thenReturn(Optional.of(tranDoi));
        when(layoutRepository.findByCodeAndActiveTrue("DOI_CAN")).thenReturn(Optional.of(doiCan));
        when(layoutRepository.findByCodeAndActiveTrue("KHOI_MAU")).thenReturn(Optional.of(khoiMau));
        when(layoutRepository.findByCodeAndActiveTrue("CONTACT_SHEET")).thenReturn(Optional.of(contactSheet));

        PhotobookTemplate template = new PhotobookTemplate();
        template.setCode("MAC_DINH");
        template.setDefaultTemplate(true);
        template.setLayoutCodes(
                "[\"TRAN_DOI\",\"DOI_CAN\",\"CONTACT_SHEET\",\"TRAN_DOI\",\"DOI_CAN\",\"KHOI_MAU\",\"CONTACT_SHEET\",\"DOI_CAN\"]");
        when(templateRepository.findByDefaultTemplateTrue()).thenReturn(Optional.of(template));
    }

    private PhotobookLayout layout(String code, String slotsJson) {
        PhotobookLayout layout = new PhotobookLayout();
        layout.setId(UUID.randomUUID());
        layout.setCode(code);
        layout.setName(code);
        layout.setSlots(slotsJson);
        layout.setActive(true);
        return layout;
    }

    private String contactSheetSlotsJson() {
        StringBuilder json = new StringBuilder("[");
        for (int i = 0; i < 12; i++) {
            if (i > 0) json.append(',');
            json.append("{\"x\":0,\"y\":0,\"w\":0.22,\"h\":0.3,\"bleed\":false}");
        }
        return json.append(']').toString();
    }

    private PhotobookProject projectWithPhotos(int pageCount, int photoCount) {
        User user = new User();
        user.setId(UUID.randomUUID());
        Order order = new Order();
        order.setId(UUID.randomUUID());

        PhotobookProject project = new PhotobookProject();
        project.setId(UUID.randomUUID());
        project.setUser(user);
        project.setOrder(order);
        project.setPageCount(pageCount);
        for (int i = 0; i < photoCount; i++) {
            PhotobookProjectPhoto photo = new PhotobookProjectPhoto();
            photo.setId(UUID.randomUUID());
            photo.setPublicId("photo-" + i);
            project.getPhotos().add(photo);
        }
        return project;
    }

    @Test
    void slotDefsOf_parsesCoordinatesAndBleedFlag() {
        var defs = engine.slotDefsOf(tranDoi);

        assertThat(defs).hasSize(1);
        assertThat(defs.get(0).bleed()).isTrue();
        assertThat(defs.get(0).w()).isEqualTo(1.0);

        assertThat(engine.slotDefsOf(khoiMau)).isEmpty();
        assertThat(engine.slotDefsOf(contactSheet)).hasSize(12);
    }

    @Test
    void generateSpreads_appliesTheCycleAndOpensWithATranDoiSpread() {
        // 20 trang = 10 spread. Chu kỳ dài 8 nên spread 9 lặp lại vị trí 1 (TRAN_DOI).
        PhotobookProject project = projectWithPhotos(20, 200);

        List<PhotobookSpread> spreads = engine.generateSpreads(project);

        assertThat(spreads).hasSize(10);
        assertThat(spreads.get(0).getLayoutCode()).isEqualTo("TRAN_DOI");
        assertThat(spreads.get(1).getLayoutCode()).isEqualTo("DOI_CAN");
        assertThat(spreads.get(5).getLayoutCode()).isEqualTo("KHOI_MAU");
        assertThat(spreads.get(8).getLayoutCode()).isEqualTo("TRAN_DOI"); // vị trí 9 → cycle[8 % 8]=cycle[0]
        for (int i = 0; i < spreads.size(); i++) {
            assertThat(spreads.get(i).getPosition()).isEqualTo(i + 1);
        }
    }

    @Test
    void generateSpreads_colorBlockSpreadsGetNoPhotos() {
        PhotobookProject project = projectWithPhotos(20, 200);

        List<PhotobookSpread> spreads = engine.generateSpreads(project);

        PhotobookSpread colorBlock = spreads.get(5);
        assertThat(colorBlock.getLayoutCode()).isEqualTo("KHOI_MAU");
        assertThat(colorBlock.getSlots()).isEmpty();
    }

    @Test
    void generateSpreads_fillsSlotsInUploadOrderAndLeavesSurplusUnassigned() {
        // 20 trang = 10 spread: 8 spread trọn 1 chu kỳ (1+2+12+1+2+0+12+2=32 ô) cộng 2 spread
        // đầu chu kỳ lặp lại (TRAN_DOI=1, DOI_CAN=2) = 35 ô. Gửi dư 40 ảnh thì thừa 5 ảnh.
        PhotobookProject project = projectWithPhotos(20, 40);
        List<PhotobookProjectPhoto> photos = project.getPhotos();

        List<PhotobookSpread> spreads = engine.generateSpreads(project);

        // Spread 1 (TRAN_DOI, 1 ô) nhận đúng ảnh đầu tiên đã gửi lên.
        assertThat(spreads.get(0).getSlots()).extracting(PhotobookSpreadSlot::getPhoto)
                .containsExactly(photos.get(0));
        // Spread 2 (DOI_CAN, 2 ô) nhận hai ảnh kế tiếp, đúng thứ tự.
        assertThat(spreads.get(1).getSlots()).extracting(PhotobookSpreadSlot::getPhoto)
                .containsExactly(photos.get(1), photos.get(2));

        long assigned = spreads.stream().flatMap(s -> s.getSlots().stream())
                .filter(slot -> slot.getPhoto() != null).count();
        assertThat(assigned).isEqualTo(35);
    }

    @Test
    void generateSpreads_neverAssignsTheSamePhotoToTwoSlots() {
        PhotobookProject project = projectWithPhotos(150, 450); // mức trần: 150 trang, 75 spread

        List<PhotobookSpread> spreads = engine.generateSpreads(project);

        List<PhotobookProjectPhoto> assignedPhotos = spreads.stream()
                .flatMap(s -> s.getSlots().stream())
                .map(PhotobookSpreadSlot::getPhoto)
                .filter(p -> p != null)
                .toList();
        assertThat(assignedPhotos).doesNotHaveDuplicates();
    }

    @Test
    void rebuildSlots_keepsPhotosAtTheSameIndexWhenTheNewLayoutStillHasThatSlot() {
        PhotobookProject project = projectWithPhotos(20, 2);
        PhotobookSpread spread = new PhotobookSpread();
        spread.setLayoutCode("DOI_CAN");
        PhotobookSpreadSlot slot0 = new PhotobookSpreadSlot();
        slot0.setSlotIndex(0);
        slot0.setPhoto(project.getPhotos().get(0));
        PhotobookSpreadSlot slot1 = new PhotobookSpreadSlot();
        slot1.setSlotIndex(1);
        slot1.setPhoto(project.getPhotos().get(1));
        spread.getSlots().add(slot0);
        spread.getSlots().add(slot1);

        // Đổi sang CONTACT_SHEET (12 ô) — hai ảnh cũ ở index 0 và 1 phải còn nguyên chỗ.
        List<PhotobookSpreadSlot> rebuilt = engine.rebuildSlots(spread, contactSheet);

        assertThat(rebuilt).hasSize(12);
        assertThat(rebuilt.get(0).getPhoto()).isEqualTo(project.getPhotos().get(0));
        assertThat(rebuilt.get(1).getPhoto()).isEqualTo(project.getPhotos().get(1));
        assertThat(rebuilt.get(2).getPhoto()).isNull();
    }

    @Test
    void rebuildSlots_dropsPhotosThatFallOutsideTheSmallerLayout() {
        PhotobookProject project = projectWithPhotos(20, 12);
        PhotobookSpread spread = new PhotobookSpread();
        spread.setLayoutCode("CONTACT_SHEET");
        for (int i = 0; i < 12; i++) {
            PhotobookSpreadSlot slot = new PhotobookSpreadSlot();
            slot.setSlotIndex(i);
            slot.setPhoto(project.getPhotos().get(i));
            spread.getSlots().add(slot);
        }

        // Đổi sang TRAN_DOI (1 ô) — chỉ ảnh ở index 0 giữ được chỗ, 11 ảnh còn lại rơi khỏi spread.
        List<PhotobookSpreadSlot> rebuilt = engine.rebuildSlots(spread, tranDoi);

        assertThat(rebuilt).hasSize(1);
        assertThat(rebuilt.get(0).getPhoto()).isEqualTo(project.getPhotos().get(0));
    }

    @Test
    void requireLayout_rejectsAnUnknownCode() {
        when(layoutRepository.findByCodeAndActiveTrue("KHONG_TON_TAI")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> engine.requireLayout("KHONG_TON_TAI")).isInstanceOf(AppException.class);
    }
}
