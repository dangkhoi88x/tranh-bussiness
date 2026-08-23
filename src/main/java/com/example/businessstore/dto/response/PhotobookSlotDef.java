package com.example.businessstore.dto.response;

/**
 * Định nghĩa một ô trong archetype: toạ độ tính theo % của cả spread (0..1). Dùng cả để parse
 * JSON lưu trong {@code photobook_layouts.slots} (Jackson khớp theo tên trường) lẫn để trả về
 * frontend — cùng một hình dạng dữ liệu nên không tách hai class.
 */
public record PhotobookSlotDef(double x, double y, double w, double h, boolean bleed) {
}
