package com.example.businessstore.dto.response;

import java.util.List;
import java.util.UUID;

/**
 * Mảng JSON trong DB được trả ra đã tách sẵn thành list — client không phải parse chuỗi lần nữa,
 * và mọi lỗi định dạng lộ ra ngay ở màn quản trị thay vì tới lúc trình sửa vẽ bản xem trước.
 */
public record PhotobookTemplateResponse(
        UUID id,
        String code,
        String name,
        String description,
        String icon,
        List<String> layoutCycle,
        List<String> spreadColors,
        List<PresetCaptionResponse> presetCaptions,
        String defaultFont,
        String defaultCaptionColor,
        boolean defaultTemplate,
        boolean active,
        int sortOrder) {

    public record PresetCaptionResponse(
            int spreadIndex,
            String text,
            double fontSize,
            String fontFamily,
            String color,
            String align) {
    }
}
