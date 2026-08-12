package com.example.businessstore.service.impl;

import com.example.businessstore.dto.request.SavePhotobookTemplateRequest;
import com.example.businessstore.dto.response.PhotobookTemplateResponse;
import com.example.businessstore.entity.PhotobookLayout;
import com.example.businessstore.entity.PhotobookTemplate;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookLayoutRepository;
import com.example.businessstore.repository.PhotobookTemplateRepository;
import com.example.businessstore.service.PhotobookTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PhotobookTemplateServiceImpl implements PhotobookTemplateService {

    private final PhotobookTemplateRepository templateRepository;
    private final PhotobookLayoutRepository layoutRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public List<PhotobookTemplateResponse> findActive() {
        return templateRepository.findAllByActiveTrueOrderBySortOrderAscNameAsc().stream()
                .map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PhotobookTemplateResponse> findAllForManagement() {
        return templateRepository.findAllByOrderBySortOrderAscNameAsc().stream()
                .map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public PhotobookTemplateResponse create(SavePhotobookTemplateRequest request) {
        String code = request.code().trim();
        if (templateRepository.existsByCode(code)) {
            throw new AppException(ErrorCode.PHOTOBOOK_TEMPLATE_CODE_ALREADY_EXISTS,
                    "A photobook template with code " + code + " already exists");
        }
        PhotobookTemplate template = new PhotobookTemplate();
        template.setCode(code);
        apply(template, request);
        return toResponse(templateRepository.save(template));
    }

    @Override
    @Transactional
    public PhotobookTemplateResponse update(UUID id, SavePhotobookTemplateRequest request) {
        PhotobookTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_TEMPLATE_NOT_FOUND,
                        "Photobook template not found"));
        // Mã không đổi được: order_items và photobook_projects chụp lại mã chứ không giữ khoá
        // ngoại, đổi mã ở đây là làm mọi cuốn đã bán trỏ vào khoảng không.
        apply(template, request);
        return toResponse(templateRepository.save(template));
    }

    private void apply(PhotobookTemplate template, SavePhotobookTemplateRequest request) {
        requireKnownLayouts(request.layoutCycle());
        if (request.defaultTemplate() && !request.active()) {
            throw new AppException(ErrorCode.INVALID_PHOTOBOOK_TEMPLATE,
                    "The default template cannot be hidden — it is what every book without a chosen theme falls back to");
        }
        template.setName(request.name().trim());
        template.setDescription(blankToNull(request.description()));
        template.setIcon(blankToNull(request.icon()));
        template.setLayoutCodes(writeJson(request.layoutCycle()));
        template.setSpreadColors(writeJson(request.spreadColors()));
        template.setPresetCaptions(writeJson(request.presetCaptions() == null ? List.of() : request.presetCaptions()));
        template.setDefaultFont(request.defaultFont().trim());
        template.setDefaultCaptionColor(request.defaultCaptionColor().trim());
        template.setActive(request.active());
        template.setSortOrder(request.sortOrder());

        // Đúng một mẫu mặc định: cờ này là thứ PhotobookLayoutEngine lùi về khi cuốn không mang
        // mã nào, nên hai mẫu cùng bật sẽ cho kết quả phụ thuộc thứ tự dòng trả về của DB, còn
        // không mẫu nào bật thì khách không gửi được ảnh.
        if (request.defaultTemplate()) {
            clearOtherDefaults(template);
            template.setDefaultTemplate(true);
        } else if (template.isDefaultTemplate()) {
            throw new AppException(ErrorCode.INVALID_PHOTOBOOK_TEMPLATE,
                    "Pick another template as the default before clearing this one");
        }
    }

    private void clearOtherDefaults(PhotobookTemplate template) {
        List<PhotobookTemplate> others = template.getId() == null
                ? templateRepository.findAllByDefaultTemplateTrue()
                : templateRepository.findAllByDefaultTemplateTrueAndIdNot(template.getId());
        others.forEach(other -> other.setDefaultTemplate(false));
        templateRepository.saveAll(others);
    }

    /**
     * Chu kỳ trỏ tới mã bố cục không tồn tại thì PhotobookLayoutEngine lặng lẽ bỏ qua vị trí đó
     * và cuốn ra thiếu spread — chặn ngay ở đây thay vì để lộ ra lúc khách gửi ảnh.
     */
    private void requireKnownLayouts(List<String> layoutCycle) {
        Set<String> known = layoutRepository.findAllByActiveTrueOrderBySortOrderAsc().stream()
                .map(PhotobookLayout::getCode).collect(Collectors.toSet());
        List<String> unknown = layoutCycle.stream().map(String::trim)
                .filter(code -> !known.contains(code)).distinct().toList();
        if (!unknown.isEmpty()) {
            throw new AppException(ErrorCode.INVALID_PHOTOBOOK_TEMPLATE,
                    "Unknown or inactive layout codes: " + String.join(", ", unknown));
        }
    }

    private String writeJson(Object value) {
        return objectMapper.writeValueAsString(value);
    }

    private <T> List<T> readList(String json, TypeReference<List<T>> type, String field, String code) {
        try {
            return objectMapper.readValue(json, type);
        } catch (JacksonException exception) {
            throw new AppException(ErrorCode.INVALID_PHOTOBOOK_TEMPLATE,
                    "Corrupt " + field + " for template " + code);
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private PhotobookTemplateResponse toResponse(PhotobookTemplate template) {
        return new PhotobookTemplateResponse(
                template.getId(),
                template.getCode(),
                template.getName(),
                template.getDescription(),
                template.getIcon(),
                readList(template.getLayoutCodes(), new TypeReference<List<String>>() {
                }, "layout_codes", template.getCode()),
                readList(template.getSpreadColors(), new TypeReference<List<String>>() {
                }, "spread_colors", template.getCode()),
                readList(template.getPresetCaptions(),
                        new TypeReference<List<PhotobookTemplateResponse.PresetCaptionResponse>>() {
                        }, "preset_captions", template.getCode()),
                template.getDefaultFont(),
                template.getDefaultCaptionColor(),
                template.isDefaultTemplate(),
                template.isActive(),
                template.getSortOrder());
    }
}
