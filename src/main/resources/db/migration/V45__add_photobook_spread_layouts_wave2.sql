-- 10 layout archetype mới (wave 2), nâng tổng từ 10 lên 20 kiểu bố cục spread.
-- Toạ độ x,y,w,h là tỷ lệ % của cả spread (trang trái + trang phải), 0..1.

-- 11 · Toàn cảnh — 1 dải ngang rộng ở giữa
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000511', 'PANORAMA', 'Toàn cảnh',
        '[{"x":0.03,"y":0.25,"w":0.94,"h":0.50,"bleed":false}]',
        11, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 12 · Một hai — 1 ảnh rộng trên + 2 ảnh dưới
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000512', 'MOT_HAI', 'Một hai',
        '[{"x":0.04,"y":0.05,"w":0.92,"h":0.45,"bleed":false},' ||
        '{"x":0.04,"y":0.55,"w":0.44,"h":0.40,"bleed":false},' ||
        '{"x":0.52,"y":0.55,"w":0.44,"h":0.40,"bleed":false}]',
        12, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 13 · Hai một — 2 ảnh trên + 1 ảnh rộng dưới
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000513', 'HAI_MOT', 'Hai một',
        '[{"x":0.04,"y":0.05,"w":0.44,"h":0.40,"bleed":false},' ||
        '{"x":0.52,"y":0.05,"w":0.44,"h":0.40,"bleed":false},' ||
        '{"x":0.04,"y":0.50,"w":0.92,"h":0.45,"bleed":false}]',
        13, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 14 · Bậc thang — 3 ảnh xếp chéo bậc thang
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000514', 'BAC_THANG', 'Bậc thang',
        '[{"x":0.04,"y":0.05,"w":0.28,"h":0.42,"bleed":false},' ||
        '{"x":0.36,"y":0.29,"w":0.28,"h":0.42,"bleed":false},' ||
        '{"x":0.68,"y":0.53,"w":0.28,"h":0.42,"bleed":false}]',
        14, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 15 · Năm ô — 2 ảnh trên + 3 ảnh dưới
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000515', 'NAM_O', 'Năm ô',
        '[{"x":0.03,"y":0.05,"w":0.46,"h":0.43,"bleed":false},' ||
        '{"x":0.51,"y":0.05,"w":0.46,"h":0.43,"bleed":false},' ||
        '{"x":0.03,"y":0.52,"w":0.30,"h":0.43,"bleed":false},' ||
        '{"x":0.35,"y":0.52,"w":0.30,"h":0.43,"bleed":false},' ||
        '{"x":0.67,"y":0.52,"w":0.30,"h":0.43,"bleed":false}]',
        15, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 16 · Khung đôi — 2 ảnh viền rộng, thanh lịch
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000516', 'KHUNG_DOI', 'Khung đôi',
        '[{"x":0.08,"y":0.10,"w":0.34,"h":0.80,"bleed":false},' ||
        '{"x":0.58,"y":0.10,"w":0.34,"h":0.80,"bleed":false}]',
        16, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 17 · Ba tầng — 3 dải ngang xếp chồng
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000517', 'BA_TANG', 'Ba tầng',
        '[{"x":0.04,"y":0.04,"w":0.92,"h":0.28,"bleed":false},' ||
        '{"x":0.04,"y":0.36,"w":0.92,"h":0.28,"bleed":false},' ||
        '{"x":0.04,"y":0.68,"w":0.92,"h":0.28,"bleed":false}]',
        17, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 18 · Ghép hình — mosaic 5 ô kích thước khác nhau
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000518', 'GHEP_HINH', 'Ghép hình',
        '[{"x":0.03,"y":0.05,"w":0.58,"h":0.55,"bleed":false},' ||
        '{"x":0.65,"y":0.05,"w":0.32,"h":0.26,"bleed":false},' ||
        '{"x":0.65,"y":0.34,"w":0.32,"h":0.26,"bleed":false},' ||
        '{"x":0.03,"y":0.64,"w":0.30,"h":0.31,"bleed":false},' ||
        '{"x":0.35,"y":0.64,"w":0.62,"h":0.31,"bleed":false}]',
        18, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 19 · Dọc ngang — 1 ảnh dọc cao + 2 ảnh ngang xếp chồng
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000519', 'DOC_NGANG', 'Dọc ngang',
        '[{"x":0.04,"y":0.06,"w":0.35,"h":0.88,"bleed":false},' ||
        '{"x":0.44,"y":0.06,"w":0.52,"h":0.42,"bleed":false},' ||
        '{"x":0.44,"y":0.52,"w":0.52,"h":0.42,"bleed":false}]',
        19, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 20 · Viền lớn — 1 ảnh giữa, viền rộng xung quanh
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000520', 'VIEN_LON', 'Viền lớn',
        '[{"x":0.15,"y":0.12,"w":0.70,"h":0.76,"bleed":false}]',
        20, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- Cập nhật chu kỳ mặc định: 20 layout.
UPDATE photobook_templates
SET layout_codes = '["TRAN_DOI","DOI_CAN","MOT_LON_MOT_NHO","BA_NGANG","CHU_L","KHOI_MAU","BON_O","BA_TAM","CONTACT_SHEET","SAU_O","PANORAMA","MOT_HAI","HAI_MOT","BAC_THANG","NAM_O","KHUNG_DOI","BA_TANG","GHEP_HINH","DOC_NGANG","VIEN_LON"]',
    updated_at   = CURRENT_TIMESTAMP
WHERE code = 'MAC_DINH';
