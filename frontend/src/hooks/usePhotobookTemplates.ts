import { useEffect, useState } from 'react';
import { fetchPhotobookTemplates, toStoreTemplate } from '../api/photobookTemplates';
import { PHOTOBOOK_TEMPLATES, type PhotobookTemplate } from '../data/photobookTemplates';

/**
 * Chủ đề photobook lấy từ server để xưởng sửa được ở màn quản trị mà không cần build lại.
 * Danh sách đóng gói sẵn trong bundle vẫn là giá trị khởi tạo: trình sửa vẽ được ngay từ lần
 * render đầu, và một lần gọi API hỏng không làm trang chọn chủ đề trống trơn.
 */
export function usePhotobookTemplates(): PhotobookTemplate[] {
  const [templates, setTemplates] = useState<PhotobookTemplate[]>(PHOTOBOOK_TEMPLATES);

  useEffect(() => {
    let active = true;
    fetchPhotobookTemplates()
      .then((rows) => {
        if (active && rows.length > 0) setTemplates(rows.map(toStoreTemplate));
      })
      .catch(() => {
        /* giữ nguyên danh sách đóng gói sẵn */
      });
    return () => {
      active = false;
    };
  }, []);

  return templates;
}
