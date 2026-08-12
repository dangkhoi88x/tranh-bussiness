package com.example.businessstore.service.impl;

import com.example.businessstore.dto.response.PhotobookDesignResponse;
import com.example.businessstore.entity.PhotobookDesign;
import com.example.businessstore.entity.User;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookDesignRepository;
import com.example.businessstore.repository.UserRepository;
import com.example.businessstore.service.MediaStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PhotobookDesignServiceImplTest {

    @Mock private PhotobookDesignRepository repository;
    @Mock private UserRepository userRepository;
    @Mock private MediaStorageService mediaStorageService;
    @Spy private ObjectMapper objectMapper = new ObjectMapper();
    private PhotobookSpreadsPayloadValidator payloadValidator;
    private PhotobookDesignServiceImpl service;

    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        payloadValidator = new PhotobookSpreadsPayloadValidator(objectMapper);
        service = new PhotobookDesignServiceImpl(repository, userRepository, mediaStorageService, payloadValidator);

        User user = new User();
        user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(repository.save(any(PhotobookDesign.class))).thenAnswer(call -> {
            PhotobookDesign design = call.getArgument(0);
            if (design.getId() == null) design.setId(UUID.randomUUID());
            return design;
        });
        when(mediaStorageService.uploadPhotobookDesignImage(any(), any()))
                .thenReturn(new MediaStorageService.UploadedMedia("public-id", "https://cdn.example/img"));
    }

    private String metadata(int pageCount, int spreadCount) {
        StringBuilder spreads = new StringBuilder();
        for (int i = 1; i <= spreadCount; i++) {
            if (i > 1) spreads.append(',');
            spreads.append("{\"position\":").append(i)
                    .append(",\"layoutCode\":\"TRAN_DOI\",\"backgroundColor\":\"#ffffff\",\"captions\":[],")
                    .append("\"slots\":[{\"imageId\":\"img-").append(i).append("\"}]}");
        }
        return "{\"productSlug\":\"photobook-eco-matte\",\"pageCount\":" + pageCount
                + ",\"sizeLabel\":\"Size S\",\"finish\":\"Eco Matte\",\"templateId\":\"free\","
                + "\"spreads\":[" + spreads + "]}";
    }

    private MultipartFile fileNamed(String name) {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getOriginalFilename()).thenReturn(name);
        return file;
    }

    @Test
    void create_savesTheDesignAndUploadsEachReferencedImage() {
        String json = metadata(20, 10);
        List<MultipartFile> images = List.of(fileNamed("img-1"), fileNamed("img-2"), fileNamed("img-3"),
                fileNamed("img-4"), fileNamed("img-5"), fileNamed("img-6"), fileNamed("img-7"),
                fileNamed("img-8"), fileNamed("img-9"), fileNamed("img-10"));

        PhotobookDesignResponse response = service.create(userId, json, images);

        assertThat(response.id()).isNotNull();
    }

    @Test
    void create_rejectsWhenSpreadCountDoesNotMatchPageCount() {
        // 20 trang phải có đúng 10 spread; gửi 3 là sai, phải chặn trước khi đụng tới ảnh.
        String json = metadata(20, 3);
        List<MultipartFile> images = List.of(fileNamed("img-1"), fileNamed("img-2"), fileNamed("img-3"));

        assertThatThrownBy(() -> service.create(userId, json, images))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.INVALID_REQUEST));
    }

    @Test
    void create_rejectsWhenUploadedImagesDoNotMatchTheSlots() {
        String json = metadata(20, 10);
        List<MultipartFile> images = List.of(fileNamed("wrong-name"));

        assertThatThrownBy(() -> service.create(userId, json, images))
                .isInstanceOfSatisfying(AppException.class,
                        e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.INVALID_REQUEST));
    }
}
