package com.example.businessstore.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Dùng chung cho tạo mới và cập nhật: một chủ đề chỉ có nghĩa khi khai đủ chu kỳ bố cục và bộ
 * màu, nên không có trường nào "sửa lẻ" được — form quản trị luôn gửi lên toàn bộ.
 * {@code code} bị bỏ qua khi cập nhật; đổi mã sẽ làm mọi dòng đơn đã chụp mã cũ mồ côi.
 */
public record SavePhotobookTemplateRequest(
        @NotBlank @Size(max = 40) @Pattern(regexp = "[A-Za-z0-9_-]+",
                message = "Mã chỉ gồm chữ, số, gạch ngang và gạch dưới") String code,
        @NotBlank @Size(max = 120) String name,
        @Size(max = 2000) String description,
        @Size(max = 16) String icon,
        @NotEmpty List<@NotBlank @Size(max = 40) String> layoutCycle,
        @NotEmpty List<@NotBlank @Pattern(regexp = "#[0-9a-fA-F]{3,8}",
                message = "Màu nền phải ở dạng mã hex, ví dụ #ffffff") String> spreadColors,
        @Valid List<PresetCaptionRequest> presetCaptions,
        @NotBlank @Size(max = 80) String defaultFont,
        @NotBlank @Pattern(regexp = "#[0-9a-fA-F]{3,8}",
                message = "Màu chữ phải ở dạng mã hex") String defaultCaptionColor,
        boolean defaultTemplate,
        boolean active,
        @Min(0) int sortOrder) {

    public record PresetCaptionRequest(
            @Min(0) int spreadIndex,
            @NotBlank @Size(max = 200) String text,
            @DecimalMin("0.5") @DecimalMax("40") double fontSize,
            @NotBlank @Size(max = 80) String fontFamily,
            @NotBlank @Pattern(regexp = "#[0-9a-fA-F]{3,8}") String color,
            @Pattern(regexp = "left|center|right") String align) {
    }
}
