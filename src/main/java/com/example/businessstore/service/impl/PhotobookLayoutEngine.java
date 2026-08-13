package com.example.businessstore.service.impl;

import com.example.businessstore.dto.response.PhotobookSlotDef;
import com.example.businessstore.entity.PhotobookLayout;
import com.example.businessstore.entity.PhotobookProject;
import com.example.businessstore.entity.PhotobookProjectPhoto;
import com.example.businessstore.entity.PhotobookSpread;
import com.example.businessstore.entity.PhotobookSpreadSlot;
import com.example.businessstore.entity.PhotobookTemplate;
import com.example.businessstore.exception.AppException;
import com.example.businessstore.exception.ErrorCode;
import com.example.businessstore.repository.PhotobookLayoutRepository;
import com.example.businessstore.repository.PhotobookTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Logic thuần cho storyboard: sinh spread từ template, phân phối ảnh vào ô, và tính lại ô khi
 * đổi archetype của một spread. Không tự lưu gì — nơi gọi (service có transaction) quyết định
 * thứ tự ghi xuống DB, vì đổi archetype cần xoá-rồi-chèn theo đúng thứ tự để không đụng ràng
 * buộc unique (spread_id, slot_index).
 */
@Component
@RequiredArgsConstructor
class PhotobookLayoutEngine {

    private final PhotobookLayoutRepository layoutRepository;
    private final PhotobookTemplateRepository templateRepository;
    private final ObjectMapper objectMapper;

    List<PhotobookLayout> activeLayouts() {
        return layoutRepository.findAllByActiveTrueOrderBySortOrderAsc();
    }

    PhotobookLayout requireLayout(String code) {
        return layoutRepository.findByCodeAndActiveTrue(code)
                .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_LAYOUT_NOT_FOUND,
                        "Không tìm thấy bố cục đang dùng được: " + code));
    }

    List<PhotobookSlotDef> slotDefsOf(PhotobookLayout layout) {
        try {
            return objectMapper.readValue(layout.getSlots(), new TypeReference<List<PhotobookSlotDef>>() {
            });
        } catch (JacksonException exception) {
            throw new AppException(ErrorCode.PHOTOBOOK_LAYOUT_NOT_FOUND,
                    "Dữ liệu ô ảnh của bố cục " + layout.getCode() + " bị hỏng.");
        }
    }

    /**
     * Sinh toàn bộ spread (chưa lưu) cho một cuốn, theo chu kỳ archetype của mẫu khách đã chọn
     * lúc mua, và phân phối ảnh của khách vào các ô theo đúng thứ tự đã gửi lên. Ảnh nhiều hơn
     * số ô thì phần dư không được gán — chúng hiện ở danh sách "chưa xếp" để khách tự kéo vào sau.
     */
    List<PhotobookSpread> generateSpreads(PhotobookProject project) {
        List<String> cycle = cycleFor(project.getTemplateCode());
        Map<String, PhotobookLayout> byCode = activeLayouts().stream()
                .collect(Collectors.toMap(PhotobookLayout::getCode, layout -> layout));
        int numSpreads = project.getPageCount() / 2;
        List<PhotobookProjectPhoto> photos = project.getPhotos();

        List<PhotobookSpread> spreads = new ArrayList<>(numSpreads);
        int cursor = 0;
        for (int position = 1; position <= numSpreads; position++) {
            String code = cycle.get((position - 1) % cycle.size());
            PhotobookLayout layout = byCode.get(code);
            if (layout == null) {
                // Template trỏ tới mã không còn active — bỏ qua vị trí đó thay vì làm hỏng cả cuốn.
                continue;
            }
            PhotobookSpread spread = new PhotobookSpread();
            spread.setPhotobookProject(project);
            spread.setPosition(position);
            spread.setLayoutCode(code);

            List<PhotobookSlotDef> defs = slotDefsOf(layout);
            for (int slotIndex = 0; slotIndex < defs.size(); slotIndex++) {
                PhotobookSpreadSlot slot = new PhotobookSpreadSlot();
                slot.setPhotobookSpread(spread);
                slot.setSlotIndex(slotIndex);
                if (cursor < photos.size()) {
                    slot.setPhoto(photos.get(cursor));
                    cursor++;
                }
                spread.getSlots().add(slot);
            }
            spreads.add(spread);
        }
        return spreads;
    }

    /**
     * Danh sách ô mới (chưa lưu) cho layout vừa chọn, giữ ảnh theo đúng slotIndex nếu ô đó còn
     * tồn tại ở layout mới. Ô bị cắt bớt (layout mới ít ô hơn) làm ảnh của nó rơi về diện
     * "chưa xếp" — không tự động dồn sang spread khác, để khách chủ động chọn lại.
     */
    List<PhotobookSpreadSlot> rebuildSlots(PhotobookSpread spread, PhotobookLayout newLayout) {
        Map<Integer, PhotobookProjectPhoto> existingByIndex = spread.getSlots().stream()
                .filter(slot -> slot.getPhoto() != null)
                .collect(Collectors.toMap(PhotobookSpreadSlot::getSlotIndex, PhotobookSpreadSlot::getPhoto));

        List<PhotobookSlotDef> defs = slotDefsOf(newLayout);
        List<PhotobookSpreadSlot> result = new ArrayList<>(defs.size());
        for (int slotIndex = 0; slotIndex < defs.size(); slotIndex++) {
            PhotobookSpreadSlot slot = new PhotobookSpreadSlot();
            slot.setPhotobookSpread(spread);
            slot.setSlotIndex(slotIndex);
            slot.setPhoto(existingByIndex.get(slotIndex));
            result.add(slot);
        }
        return result;
    }

    /**
     * Cuốn đặt trước khi có tính năng chọn mẫu không mang mã nào, và một mẫu đã bán vẫn có thể
     * bị gỡ khỏi thư viện sau đó (order_items chụp lại mã chứ không khoá ngoại) — cả hai trường
     * hợp đều lùi về mẫu mặc định thay vì chặn khách gửi ảnh.
     */
    private List<String> cycleFor(String templateCode) {
        PhotobookTemplate template = templateCode == null || templateCode.isBlank()
                ? null
                : templateRepository.findByCode(templateCode).orElse(null);
        if (template == null) {
            template = templateRepository.findByDefaultTemplateTrue()
                    .orElseThrow(() -> new AppException(ErrorCode.PHOTOBOOK_LAYOUT_NOT_FOUND,
                            "Chưa cấu hình mẫu photobook mặc định."));
        }
        try {
            return objectMapper.readValue(template.getLayoutCodes(), new TypeReference<List<String>>() {
            });
        } catch (JacksonException exception) {
            throw new AppException(ErrorCode.PHOTOBOOK_LAYOUT_NOT_FOUND,
                    "Danh sách bố cục của mẫu " + template.getCode() + " bị hỏng.");
        }
    }
}
