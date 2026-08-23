-- Mẫu khách chọn phải theo được suốt giỏ → đơn → project. PhotobookLayoutEngine dựng spread ở
-- bước submit() (khách gửi ảnh), rất lâu sau lúc mua, và trước script này nó chỉ biết
-- findByDefaultTemplateTrue() — nên mọi cuốn không kèm bản thiết kế đều ra chu kỳ mặc định,
-- bất kể khách đã chọn "Đám cưới" hay "Du lịch" ở trang sản phẩm.

-- Bảy mẫu dưới đây trước nay chỉ tồn tại trong frontend (src/data/photobookTemplates.ts); mã
-- giữ nguyên id bên đó để photobook_designs.template_id đã lưu khớp thẳng, không cần bảng ánh xạ.
INSERT INTO photobook_templates (id, code, name, layout_codes, is_default, created_at, updated_at)
VALUES
    ('00000000-0000-0000-0000-000000000602', 'free', 'Tự do',
     '["TRAN_DOI","DOI_CAN","MOT_LON_MOT_NHO","BA_NGANG","CHU_L","KHOI_MAU","BON_O","BA_TAM","CONTACT_SHEET","SAU_O","PANORAMA","MOT_HAI","HAI_MOT","BAC_THANG","NAM_O","KHUNG_DOI","BA_TANG","GHEP_HINH","DOC_NGANG","VIEN_LON"]',
     FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000603', 'wedding', 'Đám cưới',
     '["TRAN_DOI","VIEN_LON","DOI_CAN","KHOI_MAU","MOT_LON_MOT_NHO","KHUNG_DOI","BA_TAM","PANORAMA","DOI_CAN","VIEN_LON","BON_O","TRAN_DOI","BA_NGANG","KHOI_MAU","DOC_NGANG","VIEN_LON","MOT_HAI","KHUNG_DOI","TRAN_DOI","VIEN_LON"]',
     FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000604', 'baby', 'Em bé',
     '["TRAN_DOI","BON_O","BA_TAM","KHOI_MAU","SAU_O","GHEP_HINH","DOI_CAN","MOT_LON_MOT_NHO","CONTACT_SHEET","VIEN_LON","NAM_O","BA_NGANG","BON_O","KHOI_MAU","TRAN_DOI","GHEP_HINH","DOI_CAN","SAU_O","BA_TAM","VIEN_LON"]',
     FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000605', 'travel', 'Du lịch',
     '["PANORAMA","TRAN_DOI","BA_NGANG","CONTACT_SHEET","MOT_HAI","DOI_CAN","GHEP_HINH","KHOI_MAU","HAI_MOT","BAC_THANG","TRAN_DOI","SAU_O","PANORAMA","NAM_O","BA_TANG","DOI_CAN","TRAN_DOI","CONTACT_SHEET","GHEP_HINH","PANORAMA"]',
     FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000606', 'graduation', 'Tốt nghiệp',
     '["VIEN_LON","DOI_CAN","MOT_LON_MOT_NHO","KHOI_MAU","BA_TAM","TRAN_DOI","BON_O","PANORAMA","KHUNG_DOI","DOC_NGANG","BA_NGANG","VIEN_LON","MOT_HAI","DOI_CAN","TRAN_DOI","KHOI_MAU","NAM_O","VIEN_LON","GHEP_HINH","TRAN_DOI"]',
     FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000607', 'family', 'Gia đình',
     '["DOI_CAN","BON_O","BA_TAM","KHOI_MAU","GHEP_HINH","TRAN_DOI","MOT_LON_MOT_NHO","SAU_O","KHUNG_DOI","DOC_NGANG","VIEN_LON","BA_NGANG","DOI_CAN","NAM_O","MOT_HAI","KHOI_MAU","BON_O","TRAN_DOI","GHEP_HINH","VIEN_LON"]',
     FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000608', 'birthday', 'Sinh nhật',
     '["TRAN_DOI","SAU_O","BA_NGANG","KHOI_MAU","GHEP_HINH","DOI_CAN","BON_O","MOT_LON_MOT_NHO","CONTACT_SHEET","VIEN_LON","NAM_O","BA_TAM","TRAN_DOI","HAI_MOT","GHEP_HINH","KHOI_MAU","DOI_CAN","SAU_O","BA_NGANG","VIEN_LON"]',
     FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO NOTHING;

-- "free" thay MAC_DINH làm mẫu mặc định. Đây là đổi tên chứ không đổi hành vi: V45 đã sửa chu kỳ
-- của MAC_DINH thành đúng 20 archetype của DEFAULT_CYCLE, nên hai bản ghi mang cùng một chu kỳ và
-- cuốn không chọn mẫu vẫn dựng y hệt trước. Cái được là mẫu mặc định giờ có mã trùng với id mà
-- trình sửa gửi lên ("free"), không còn mã MAC_DINH mà phía client không biết tới; bản ghi
-- MAC_DINH giữ lại làm dữ liệu lịch sử, chỉ mất cờ mặc định.
UPDATE photobook_templates SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE is_default AND code <> 'free';
UPDATE photobook_templates SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
WHERE code = 'free';

-- Khoá ngoại chỉ đặt ở giỏ hàng. order_items và photobook_projects là bản chụp phục vụ sản
-- xuất: xoá một mẫu khỏi thư viện không được phép làm hỏng đơn đã đặt — cùng lý do
-- order_items.photobook_design_id ở V50 cũng không có khoá ngoại.
ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS photobook_template_code VARCHAR(40)
    REFERENCES photobook_templates (code);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS photobook_template_code VARCHAR(40);
ALTER TABLE photobook_projects ADD COLUMN IF NOT EXISTS template_code VARCHAR(40);

-- V50 đã gộp khoá gộp dòng tới mức có page_count và design. Không mở rộng thêm thì cùng một
-- cuốn ở "Đám cưới" và "Du lịch" bị coi là trùng dòng, và mẫu chọn sau lặng lẽ biến mất.
DROP INDEX IF EXISTS uq_cart_items_selection;

CREATE UNIQUE INDEX uq_cart_items_selection
    ON cart_items (cart_id, product_id,
                   COALESCE(product_variant_id, '00000000-0000-0000-0000-000000000000'::uuid),
                   COALESCE(product_frame_option_id, '00000000-0000-0000-0000-000000000000'::uuid),
                   COALESCE(page_count, 0),
                   COALESCE(photobook_design_id, '00000000-0000-0000-0000-000000000000'::uuid),
                   COALESCE(photobook_template_code, ''));
