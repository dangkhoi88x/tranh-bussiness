-- 6 layout archetype mới, nâng tổng từ 4 lên 10 kiểu bố cục spread.
-- Toạ độ x,y,w,h là tỷ lệ % của cả spread (trang trái + trang phải), 0..1.

-- 05 · Một lớn một nhỏ — hero + ảnh phụ
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000505', 'MOT_LON_MOT_NHO', 'Một lớn một nhỏ',
        '[{"x":0.04,"y":0.06,"w":0.58,"h":0.88,"bleed":false},' ||
        '{"x":0.66,"y":0.30,"w":0.30,"h":0.40,"bleed":false}]',
        5, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 06 · Ba ngang — 3 ảnh hàng ngang
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000506', 'BA_NGANG', 'Ba ngang',
        '[{"x":0.03,"y":0.15,"w":0.30,"h":0.70,"bleed":false},' ||
        '{"x":0.35,"y":0.15,"w":0.30,"h":0.70,"bleed":false},' ||
        '{"x":0.67,"y":0.15,"w":0.30,"h":0.70,"bleed":false}]',
        6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 07 · Chữ L — 1 ảnh lớn bên trái + 2 ảnh xếp dọc bên phải
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000507', 'CHU_L', 'Chữ L',
        '[{"x":0.04,"y":0.06,"w":0.58,"h":0.88,"bleed":false},' ||
        '{"x":0.66,"y":0.06,"w":0.30,"h":0.42,"bleed":false},' ||
        '{"x":0.66,"y":0.52,"w":0.30,"h":0.42,"bleed":false}]',
        7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 08 · Bốn ô — lưới 2×2
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000508', 'BON_O', 'Bốn ô',
        '[{"x":0.04,"y":0.05,"w":0.44,"h":0.43,"bleed":false},' ||
        '{"x":0.52,"y":0.05,"w":0.44,"h":0.43,"bleed":false},' ||
        '{"x":0.04,"y":0.52,"w":0.44,"h":0.43,"bleed":false},' ||
        '{"x":0.52,"y":0.52,"w":0.44,"h":0.43,"bleed":false}]',
        8, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 09 · Ba tấm — triptych: giữa rộng, hai bên hẹp
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000509', 'BA_TAM', 'Ba tấm',
        '[{"x":0.03,"y":0.08,"w":0.20,"h":0.84,"bleed":false},' ||
        '{"x":0.26,"y":0.08,"w":0.48,"h":0.84,"bleed":false},' ||
        '{"x":0.77,"y":0.08,"w":0.20,"h":0.84,"bleed":false}]',
        9, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- 10 · Sáu ô — lưới 3×2
INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000510', 'SAU_O', 'Sáu ô',
        '[{"x":0.03,"y":0.05,"w":0.30,"h":0.43,"bleed":false},' ||
        '{"x":0.35,"y":0.05,"w":0.30,"h":0.43,"bleed":false},' ||
        '{"x":0.67,"y":0.05,"w":0.30,"h":0.43,"bleed":false},' ||
        '{"x":0.03,"y":0.52,"w":0.30,"h":0.43,"bleed":false},' ||
        '{"x":0.35,"y":0.52,"w":0.30,"h":0.43,"bleed":false},' ||
        '{"x":0.67,"y":0.52,"w":0.30,"h":0.43,"bleed":false}]',
        10, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- Cập nhật chu kỳ mặc định: xen kẽ đa dạng hơn với 10 layout.
UPDATE photobook_templates
SET layout_codes = '["TRAN_DOI","DOI_CAN","MOT_LON_MOT_NHO","BA_NGANG","CHU_L","KHOI_MAU","BON_O","BA_TAM","CONTACT_SHEET","SAU_O"]',
    updated_at   = CURRENT_TIMESTAMP
WHERE code = 'MAC_DINH';
