-- Chu kỳ bố cục của "Đám cưới" và "Tốt nghiệp" thưa hơn hẳn các chủ đề còn lại: đếm số ô ảnh
-- thật sự của 10 trang đôi đầu (đúng phần một cuốn 20 trang dùng tới) ra 15 và 19 ô, trong khi
-- các chủ đề khác nằm ở 28–36. Khách chọn "Đám cưới" cho cuốn 20 trang chỉ đặt được 15 tấm —
-- trung bình 1,5 tấm mỗi trang đôi, tức quá nửa số trang đôi chỉ có đúng một tấm ảnh.
--
-- Sắp lại cho hai chủ đề này về 31 và 32 ô, ngang các chủ đề còn lại, vẫn giữ đặc trưng:
-- đám cưới mở màn bằng TRAN_DOI tràn viền và giữ các nhịp VIEN_LON/KHOI_MAU, tốt nghiệp vẫn
-- mở và đóng bằng VIEN_LON trang trọng. Chỉ đảo thứ tự và thay vài mã trong 20 archetype có
-- sẵn, không thêm mã mới, nên PhotobookLayoutEngine phía backend không cần biết gì thêm.
--
-- Điều kiện layout_codes = giá trị seed ở V52 là cố ý: xưởng đã tự sửa chu kỳ ở màn quản trị
-- thì giữ nguyên bản của xưởng, script này chỉ vá đúng dữ liệu mặc định chưa ai đụng tới.

UPDATE photobook_templates SET
    layout_codes = '["TRAN_DOI","DOI_CAN","BON_O","VIEN_LON","SAU_O","MOT_LON_MOT_NHO","BA_TAM","GHEP_HINH","KHUNG_DOI","NAM_O","PANORAMA","BA_NGANG","KHOI_MAU","BON_O","DOI_CAN","GHEP_HINH","VIEN_LON","SAU_O","MOT_HAI","TRAN_DOI"]',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'wedding'
  AND layout_codes = '["TRAN_DOI","VIEN_LON","DOI_CAN","KHOI_MAU","MOT_LON_MOT_NHO","KHUNG_DOI","BA_TAM","PANORAMA","DOI_CAN","VIEN_LON","BON_O","TRAN_DOI","BA_NGANG","KHOI_MAU","DOC_NGANG","VIEN_LON","MOT_HAI","KHUNG_DOI","TRAN_DOI","VIEN_LON"]';

UPDATE photobook_templates SET
    layout_codes = '["VIEN_LON","DOI_CAN","BON_O","BA_TAM","NAM_O","TRAN_DOI","GHEP_HINH","KHUNG_DOI","SAU_O","DOC_NGANG","BA_NGANG","VIEN_LON","BON_O","KHOI_MAU","PANORAMA","NAM_O","MOT_HAI","GHEP_HINH","DOI_CAN","VIEN_LON"]',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'graduation'
  AND layout_codes = '["VIEN_LON","DOI_CAN","MOT_LON_MOT_NHO","KHOI_MAU","BA_TAM","TRAN_DOI","BON_O","PANORAMA","KHUNG_DOI","DOC_NGANG","BA_NGANG","VIEN_LON","MOT_HAI","DOI_CAN","TRAN_DOI","KHOI_MAU","NAM_O","VIEN_LON","GHEP_HINH","TRAN_DOI"]';
