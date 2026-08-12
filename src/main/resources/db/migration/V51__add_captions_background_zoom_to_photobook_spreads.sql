-- Bản thiết kế trước khi mua có caption và màu nền theo từng spread, và zoom (ngoài focal
-- point sẵn có) cho từng ô ảnh — production schema trước đây không có chỗ lưu ba thứ này,
-- nên phải bổ sung để bản hydrate từ photobook_designs không bị mất dữ liệu.
ALTER TABLE photobook_spreads
    ADD COLUMN IF NOT EXISTS background_color VARCHAR(20) NOT NULL DEFAULT '#ffffff',
    ADD COLUMN IF NOT EXISTS captions_json JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE photobook_spread_slots
    ADD COLUMN IF NOT EXISTS zoom NUMERIC(3, 2) NOT NULL DEFAULT 1.00;

ALTER TABLE photobook_spread_slots DROP CONSTRAINT IF EXISTS ck_photobook_spread_slots_zoom;
ALTER TABLE photobook_spread_slots ADD CONSTRAINT ck_photobook_spread_slots_zoom
    CHECK (zoom >= 1.00 AND zoom <= 3.00);
