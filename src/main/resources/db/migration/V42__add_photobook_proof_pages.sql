-- Bản mềm của một cuốn 30 trang là ~15 spread, không phải một tấm ảnh. Xưởng gửi PDF nhiều
-- trang (mỗi trang PDF là một spread) và Cloudinary render từng trang thành ảnh khi khách xem,
-- nên không cần lưu từng trang thành asset riêng — chỉ cần biết file có bao nhiêu trang.
ALTER TABLE photobook_proofs ADD COLUMN IF NOT EXISTS page_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE photobook_proofs ADD COLUMN IF NOT EXISTS source_pdf BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE photobook_proofs DROP CONSTRAINT IF EXISTS ck_photobook_proofs_page_count;
ALTER TABLE photobook_proofs ADD CONSTRAINT ck_photobook_proofs_page_count CHECK (page_count > 0);
