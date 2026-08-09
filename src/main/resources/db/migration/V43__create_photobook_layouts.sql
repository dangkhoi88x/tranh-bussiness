-- Thư viện archetype bố cục — dữ liệu tham chiếu dùng chung, không thuộc riêng project nào.
-- "slots" là JSON thô (mảng {x,y,w,h,bleed}, toạ độ tính theo % của cả spread, 0..1) lưu dạng
-- TEXT: không cần Postgres truy vấn theo khoá JSON nên không cần kiểu jsonb, tránh rủi ro khớp
-- kiểu cột với Hibernate khi ddl-auto=validate. Đọc/ghi JSON hoàn toàn ở tầng Java.
CREATE TABLE IF NOT EXISTS photobook_layouts (
    id         UUID PRIMARY KEY,
    code       VARCHAR(40)  NOT NULL UNIQUE,
    name       VARCHAR(120) NOT NULL,
    slots      TEXT         NOT NULL,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL
);

-- Trình tự archetype mặc định cho một cuốn — lặp lại nếu số spread nhiều hơn chu kỳ.
-- "layout_codes" cũng là JSON dạng TEXT, cùng lý do như trên.
CREATE TABLE IF NOT EXISTS photobook_templates (
    id           UUID PRIMARY KEY,
    code         VARCHAR(40)  NOT NULL UNIQUE,
    name         VARCHAR(120) NOT NULL,
    layout_codes TEXT         NOT NULL,
    is_default   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL
);

-- Một spread cụ thể của một project — sinh đúng một lần ngay khi khách chốt ảnh (submit()),
-- không sinh lại sau đó; xem PhotobookLayoutEngine.
CREATE TABLE IF NOT EXISTS photobook_spreads (
    id                    UUID PRIMARY KEY,
    photobook_project_id  UUID        NOT NULL REFERENCES photobook_projects (id) ON DELETE CASCADE,
    position              INTEGER     NOT NULL,
    layout_code           VARCHAR(40) NOT NULL REFERENCES photobook_layouts (code),
    created_at            TIMESTAMPTZ NOT NULL,
    updated_at            TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_photobook_spreads_position UNIQUE (photobook_project_id, position),
    CONSTRAINT ck_photobook_spreads_position CHECK (position > 0)
);

CREATE INDEX IF NOT EXISTS idx_photobook_spreads_project
    ON photobook_spreads (photobook_project_id, position);

-- Một ô trong spread; slot_index khớp với vị trí trong mảng "slots" của layout đang dùng.
-- Ô có thể trống (photobook_project_photo_id NULL).
CREATE TABLE IF NOT EXISTS photobook_spread_slots (
    id                          UUID          PRIMARY KEY,
    photobook_spread_id         UUID          NOT NULL REFERENCES photobook_spreads (id) ON DELETE CASCADE,
    slot_index                  INTEGER       NOT NULL,
    photobook_project_photo_id  UUID          REFERENCES photobook_project_photos (id) ON DELETE SET NULL,
    focal_x                     NUMERIC(4, 3) NOT NULL DEFAULT 0.5,
    focal_y                     NUMERIC(4, 3) NOT NULL DEFAULT 0.5,
    created_at                  TIMESTAMPTZ   NOT NULL,
    updated_at                  TIMESTAMPTZ   NOT NULL,
    CONSTRAINT uq_photobook_spread_slots UNIQUE (photobook_spread_id, slot_index),
    CONSTRAINT ck_photobook_spread_slots_index CHECK (slot_index >= 0),
    CONSTRAINT ck_photobook_spread_slots_focal CHECK (
        focal_x >= 0 AND focal_x <= 1 AND focal_y >= 0 AND focal_y <= 1
    )
);

-- Một ảnh chỉ nằm trong đúng một ô tại một thời điểm — cưỡng chế "hoán vị" (không sao chép)
-- ngay ở tầng DB, không chỉ dựa vào logic service.
CREATE UNIQUE INDEX IF NOT EXISTS uq_photobook_spread_slots_photo
    ON photobook_spread_slots (photobook_project_photo_id)
    WHERE photobook_project_photo_id IS NOT NULL;

-- ── Bộ archetype đầu tiên (4 kiểu) ──────────────────────────────────────────────────────
-- Toạ độ x,y,w,h là tỷ lệ % của cả spread (trang trái + trang phải), 0..1.
-- Id cố định (literal), theo đúng quy ước seed data của các migration trước trong repo này.

INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000501', 'TRAN_DOI', 'Tràn đôi',
        '[{"x":0,"y":0,"w":1,"h":1,"bleed":true}]',
        1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000502', 'DOI_CAN', 'Đôi cân',
        '[{"x":0.06,"y":0.08,"w":0.38,"h":0.84,"bleed":false},' ||
        '{"x":0.56,"y":0.08,"w":0.38,"h":0.84,"bleed":false}]',
        2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000503', 'KHOI_MAU', 'Khối màu',
        '[]',
        3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

INSERT INTO photobook_layouts (id, code, name, slots, sort_order, active, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000504', 'CONTACT_SHEET', 'Contact sheet',
        '[' ||
        '{"x":0.024,"y":0.025,"w":0.22,"h":0.3,"bleed":false},' ||
        '{"x":0.268,"y":0.025,"w":0.22,"h":0.3,"bleed":false},' ||
        '{"x":0.512,"y":0.025,"w":0.22,"h":0.3,"bleed":false},' ||
        '{"x":0.756,"y":0.025,"w":0.22,"h":0.3,"bleed":false},' ||
        '{"x":0.024,"y":0.35,"w":0.22,"h":0.3,"bleed":false},' ||
        '{"x":0.268,"y":0.35,"w":0.22,"h":0.3,"bleed":false},' ||
        '{"x":0.512,"y":0.35,"w":0.22,"h":0.3,"bleed":false},' ||
        '{"x":0.756,"y":0.35,"w":0.22,"h":0.3,"bleed":false},' ||
        '{"x":0.024,"y":0.675,"w":0.22,"h":0.3,"bleed":false},' ||
        '{"x":0.268,"y":0.675,"w":0.22,"h":0.3,"bleed":false},' ||
        '{"x":0.512,"y":0.675,"w":0.22,"h":0.3,"bleed":false},' ||
        '{"x":0.756,"y":0.675,"w":0.22,"h":0.3,"bleed":false}' ||
        ']',
        4, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- Chu kỳ mặc định: mở đầu bằng một ảnh tràn đôi (quy ước biên tập), xen contact sheet
-- (nhét được nhiều ảnh) và một khối màu ngắt nhịp mỗi 8 spread.
INSERT INTO photobook_templates (id, code, name, layout_codes, is_default, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000601', 'MAC_DINH', 'Mặc định',
        '["TRAN_DOI","DOI_CAN","CONTACT_SHEET","TRAN_DOI","DOI_CAN","KHOI_MAU","CONTACT_SHEET","DOI_CAN"]',
        TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;
