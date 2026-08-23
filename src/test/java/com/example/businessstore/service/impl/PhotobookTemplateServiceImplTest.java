package com.example.businessstore.service.impl;

import com.example.businessstore.dto.request.SavePhotobookTemplateRequest;
import com.example.businessstore.dto.response.PhotobookTemplateResponse;
import com.example.businessstore.entity.PhotobookLayout;
import com.example.businessstore.entity.PhotobookTemplate;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookLayoutRepository;
import com.example.businessstore.repository.PhotobookTemplateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PhotobookTemplateServiceImplTest {

    @Mock private PhotobookTemplateRepository templateRepository;
    @Mock private PhotobookLayoutRepository layoutRepository;

    private PhotobookTemplateServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PhotobookTemplateServiceImpl(templateRepository, layoutRepository, new ObjectMapper());
        when(layoutRepository.findAllByActiveTrueOrderBySortOrderAsc())
                .thenReturn(List.of(layout("TRAN_DOI"), layout("DOI_CAN")));
        when(templateRepository.save(any(PhotobookTemplate.class))).thenAnswer(invocation -> {
            PhotobookTemplate saved = invocation.getArgument(0);
            if (saved.getId() == null) saved.setId(UUID.randomUUID());
            return saved;
        });
    }

    private PhotobookLayout layout(String code) {
        PhotobookLayout layout = new PhotobookLayout();
        layout.setCode(code);
        layout.setName(code);
        layout.setSlots("[]");
        layout.setActive(true);
        return layout;
    }

    private SavePhotobookTemplateRequest request(List<String> cycle, boolean defaultTemplate, boolean active) {
        return new SavePhotobookTemplateRequest("wedding", "Đám cưới", "Mô tả", "💒",
                cycle, List.of("#ffffff"),
                List.of(new SavePhotobookTemplateRequest.PresetCaptionRequest(
                        0, "Ngày cưới", 6, "Great Vibes", "#8b4513", "center")),
                "Great Vibes", "#8b4513", defaultTemplate, active, 2);
    }

    @Test
    void create_storesTheCycleAndReturnsItParsedBack() {
        PhotobookTemplateResponse response = service.create(request(List.of("TRAN_DOI", "DOI_CAN"), false, true));

        assertThat(response.layoutCycle()).containsExactly("TRAN_DOI", "DOI_CAN");
        assertThat(response.spreadColors()).containsExactly("#ffffff");
        assertThat(response.presetCaptions()).singleElement()
                .satisfies(caption -> assertThat(caption.text()).isEqualTo("Ngày cưới"));
    }

    @Test
    void create_rejectsACycleReferencingAnUnknownLayout() {
        // Engine bỏ qua mã lạ và cuốn ra thiếu spread, nên phải chặn ngay lúc lưu chủ đề.
        assertThatThrownBy(() -> service.create(request(List.of("TRAN_DOI", "KHONG_TON_TAI"), false, true)))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_PHOTOBOOK_TEMPLATE);
    }

    @Test
    void create_rejectsADuplicateCode() {
        when(templateRepository.existsByCode("wedding")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request(List.of("TRAN_DOI"), false, true)))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.PHOTOBOOK_TEMPLATE_CODE_ALREADY_EXISTS);
    }

    @Test
    void save_clearsTheDefaultFlagOnEveryOtherTemplate() {
        PhotobookTemplate previousDefault = new PhotobookTemplate();
        previousDefault.setId(UUID.randomUUID());
        previousDefault.setCode("free");
        previousDefault.setDefaultTemplate(true);
        when(templateRepository.findAllByDefaultTemplateTrue()).thenReturn(List.of(previousDefault));

        PhotobookTemplateResponse response = service.create(request(List.of("TRAN_DOI"), true, true));

        assertThat(response.defaultTemplate()).isTrue();
        assertThat(previousDefault.isDefaultTemplate()).isFalse();
    }

    @Test
    void save_refusesToHideTheDefaultTemplate() {
        // Cuốn không chọn chủ đề lùi về mẫu mặc định, nên ẩn nó đi là chặn khách gửi ảnh.
        assertThatThrownBy(() -> service.create(request(List.of("TRAN_DOI"), true, false)))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_PHOTOBOOK_TEMPLATE);
    }

    @Test
    void update_refusesToLeaveTheLibraryWithoutADefault() {
        PhotobookTemplate current = new PhotobookTemplate();
        current.setId(UUID.randomUUID());
        current.setCode("free");
        current.setDefaultTemplate(true);
        when(templateRepository.findById(current.getId())).thenReturn(Optional.of(current));

        assertThatThrownBy(() -> service.update(current.getId(), request(List.of("TRAN_DOI"), false, true)))
                .isInstanceOf(AppException.class)
                .extracting(exception -> ((AppException) exception).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_PHOTOBOOK_TEMPLATE);
    }

    @Test
    void update_keepsTheCodeEvenWhenTheRequestCarriesADifferentOne() {
        PhotobookTemplate current = new PhotobookTemplate();
        current.setId(UUID.randomUUID());
        current.setCode("baby");
        when(templateRepository.findById(current.getId())).thenReturn(Optional.of(current));

        // request() luôn gửi code "wedding"; dòng đơn đã chụp "baby" nên mã phải giữ nguyên.
        PhotobookTemplateResponse response = service.update(current.getId(), request(List.of("DOI_CAN"), false, true));

        assertThat(response.code()).isEqualTo("baby");
        assertThat(response.name()).isEqualTo("Đám cưới");
    }
}
