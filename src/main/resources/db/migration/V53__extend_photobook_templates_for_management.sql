-- V52 mới đưa được chu kỳ bố cục của mẫu vào DB; phần "nhìn thấy được" của mẫu (biểu tượng,
-- font, màu nền từng spread, caption dựng sẵn) vẫn nằm cứng trong frontend, nên xưởng muốn
-- thêm một chủ đề mới là phải sửa code và build lại. Bổ sung nốt để bảng này là nguồn duy nhất.

-- spread_colors và preset_captions là JSON thô lưu dạng TEXT, cùng lý do như layout_codes ở V43:
-- Postgres không cần truy vấn theo khoá bên trong, đọc/ghi hoàn toàn ở tầng Java.
ALTER TABLE photobook_templates ADD COLUMN IF NOT EXISTS icon VARCHAR(16);
ALTER TABLE photobook_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE photobook_templates ADD COLUMN IF NOT EXISTS default_font VARCHAR(80) NOT NULL DEFAULT 'Archivo';
ALTER TABLE photobook_templates ADD COLUMN IF NOT EXISTS default_caption_color VARCHAR(20) NOT NULL DEFAULT '#1a1a1a';
ALTER TABLE photobook_templates ADD COLUMN IF NOT EXISTS spread_colors TEXT NOT NULL DEFAULT '["#ffffff"]';
ALTER TABLE photobook_templates ADD COLUMN IF NOT EXISTS preset_captions TEXT NOT NULL DEFAULT '[]';
ALTER TABLE photobook_templates ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE photobook_templates ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Giá trị lấy đúng từ src/data/photobookTemplates.ts để khách không thấy chủ đề đổi hình dạng
-- ngay sau khi triển khai; từ đây trở đi sửa ở màn quản trị.
UPDATE photobook_templates SET
    icon = '✨', sort_order = 1,
    description = 'Không áp chủ đề nào — bố cục xoay vòng đủ 20 kiểu, nền trắng.',
    default_font = 'Archivo', default_caption_color = '#1a1a1a',
    spread_colors = '["#ffffff"]',
    preset_captions = '[]',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'free';

UPDATE photobook_templates SET
    icon = '💒', sort_order = 2,
    description = 'Nền kem hồng, chữ viết tay, nhiều spread tràn đôi cho ảnh cưới khổ lớn.',
    default_font = 'Great Vibes', default_caption_color = '#8b4513',
    spread_colors = '["#fdf8f4","#fef0f0","#fdf8f4","#ffffff"]',
    preset_captions = '[{"spreadIndex":0,"text":"Ngày cưới","fontSize":6,"fontFamily":"Great Vibes","color":"#8b4513","align":"center"}]',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'wedding';

UPDATE photobook_templates SET
    icon = '🍼', sort_order = 3,
    description = 'Nền pastel, bố cục nhiều ô nhỏ hợp với ảnh chụp liên tiếp của bé.',
    default_font = 'Quicksand', default_caption_color = '#2c3e50',
    spread_colors = '["#f0f7ff","#fff5f5","#fefce8","#f0fdf4"]',
    preset_captions = '[{"spreadIndex":0,"text":"Chào thế giới!","fontSize":6,"fontFamily":"Quicksand","color":"#2c3e50","align":"center"}]',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'baby';

UPDATE photobook_templates SET
    icon = '✈️', sort_order = 4,
    description = 'Nhiều spread toàn cảnh và contact sheet cho ảnh phong cảnh, hành trình.',
    default_font = 'Montserrat', default_caption_color = '#1a1a1a',
    spread_colors = '["#ffffff","#f8f9fa","#ffffff","#f8f9fa"]',
    preset_captions = '[{"spreadIndex":0,"text":"Hành trình","fontSize":8,"fontFamily":"Montserrat","color":"#1a1a1a","align":"center"}]',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'travel';

UPDATE photobook_templates SET
    icon = '🎓', sort_order = 5,
    description = 'Bố cục viền lớn trang trọng, nền xanh nhạt, chữ serif.',
    default_font = 'Playfair Display', default_caption_color = '#1a365d',
    spread_colors = '["#f0f4f8","#fefce8","#f0f4f8","#ffffff"]',
    preset_captions = '[{"spreadIndex":0,"text":"Ngày tốt nghiệp","fontSize":6,"fontFamily":"Playfair Display","color":"#1a365d","align":"center"}]',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'graduation';

UPDATE photobook_templates SET
    icon = '🏠', sort_order = 6,
    description = 'Nền kem ấm, xen kẽ ô lớn và ô nhỏ cho ảnh nhiều người.',
    default_font = 'Lora', default_caption_color = '#5d4037',
    spread_colors = '["#fdf8f0","#f5f0eb","#fdf8f0","#ffffff"]',
    preset_captions = '[{"spreadIndex":0,"text":"Gia đình mình","fontSize":6,"fontFamily":"Lora","color":"#5d4037","align":"center"}]',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'family';

UPDATE photobook_templates SET
    icon = '🎂', sort_order = 7,
    description = 'Nền màu tươi, nhiều ô ghép cho ảnh tiệc chụp nhanh.',
    default_font = 'Pacifico', default_caption_color = '#7b2d8e',
    spread_colors = '["#fef5ff","#fff0f3","#f5f0ff","#fffbeb"]',
    preset_captions = '[{"spreadIndex":0,"text":"Happy Birthday!","fontSize":6,"fontFamily":"Pacifico","color":"#7b2d8e","align":"center"}]',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'birthday';

-- MAC_DINH là chu kỳ 8 archetype có từ V43, đã bị "free" thay ở V52 và chưa từng hiện ra cho
-- khách chọn. Ẩn đi thay vì xoá: cart_items trỏ tới bảng này bằng khoá ngoại, và những cuốn
-- đã đặt trước V52 vẫn phải tra được mã cũ.
UPDATE photobook_templates SET active = FALSE, sort_order = 99, updated_at = CURRENT_TIMESTAMP
WHERE code = 'MAC_DINH';

CREATE INDEX IF NOT EXISTS idx_photobook_templates_active
    ON photobook_templates (active, sort_order);
