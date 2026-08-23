-- Bản mềm xưởng gửi khách duyệt trước khi in. FAQ của xưởng hứa "sửa miễn phí 2 lần", nên
-- số lần yêu cầu sửa phải đếm được chứ không nằm trong hộp thư của ai đó.
CREATE TABLE IF NOT EXISTS photobook_proofs (
    id                   UUID PRIMARY KEY,
    photobook_project_id UUID         NOT NULL REFERENCES photobook_projects (id) ON DELETE CASCADE,
    revision             INTEGER      NOT NULL,
    public_id            VARCHAR(255) NOT NULL UNIQUE,
    staff_note           TEXT,
    decision             VARCHAR(20)  NOT NULL,
    customer_note        TEXT,
    decided_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL,
    updated_at           TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_photobook_proofs_revision UNIQUE (photobook_project_id, revision),
    CONSTRAINT ck_photobook_proofs_revision CHECK (revision > 0),
    -- decided_at và decision đi liền nhau: chưa quyết thì chưa có mốc thời gian.
    CONSTRAINT ck_photobook_proofs_decided CHECK (
        (decision = 'PENDING' AND decided_at IS NULL) OR (decision <> 'PENDING' AND decided_at IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_photobook_proofs_project
    ON photobook_proofs (photobook_project_id, revision DESC);

-- Đếm ở project để không phải quét bảng proof mỗi lần kiểm hạn mức sửa.
ALTER TABLE photobook_projects ADD COLUMN IF NOT EXISTS revision_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE photobook_projects DROP CONSTRAINT IF EXISTS ck_photobook_projects_revision_count;
ALTER TABLE photobook_projects ADD CONSTRAINT ck_photobook_projects_revision_count
    CHECK (revision_count >= 0);

-- V38 khoá cứng danh sách loại thông báo; thiếu dòng này thì mọi lần gửi bản mềm sẽ đổ
-- ở tầng DB chứ không phải ở tầng Java.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS ck_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT ck_notifications_type CHECK (
    type IN (
        'WELCOME',
        'ORDER_PLACED',
        'ORDER_CONFIRMED',
        'ORDER_SHIPPED',
        'CUSTOM_ORDER_QUOTED',
        'PHOTOBOOK_PROOF_SENT'
    )
);
