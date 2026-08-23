import { useMemo } from 'react';
import { DraftSpread, firstSpreadWithMissingImage, missingImageIds } from './draft';

/**
 * Tình trạng bản nháp, gộp trong một chỗ: thiếu ảnh nào, có đang tạm ngưng đồng bộ không, và
 * lần lưu gần nhất ra sao. Trước đây chúng nằm rời nhau nên khách đọc được nửa câu chuyện tuỳ
 * chỗ đang đứng, và lý do "không ghi đè bản nháp đồng bộ" bị nhét vào dòng trạng thái lưu —
 * chỉ hiện thoáng qua sau mỗi lần autosave. Thiếu ảnh là tin quan trọng nhất nên nó chiếm chỗ;
 * trạng thái lưu vẫn giữ dòng phụ bên dưới để khách biết thao tác của mình có được ghi lại.
 */
export function DraftStatusNotice({
  spreads,
  syncPaused,
  saveNotice = null,
  onPickMissing,
}: {
  spreads: DraftSpread[];
  /** Bản nháp mở ở thiết bị không có ảnh gốc: không ghi đè bản đồng bộ trong cả phiên này. */
  syncPaused: boolean;
  saveNotice?: string | null;
  onPickMissing: (spreadIdx: number) => void;
}) {
  const missingCount = useMemo(() => missingImageIds(spreads).length, [spreads]);
  const firstMissingIdx = useMemo(() => firstSpreadWithMissingImage(spreads), [spreads]);

  // Khi thiếu ảnh, câu tạm ngưng đồng bộ đi kèm banner. Khi khách đã chọn lại đủ, cờ tạm ngưng
  // vẫn dính cho hết phiên — vẫn phải nói, nếu không họ tưởng bản nháp đang lưu lên tài khoản.
  const quietLines = [saveNotice, missingCount === 0 && syncPaused ? SYNC_PAUSED_TEXT : null].filter(
    (line): line is string => !!line,
  );

  if (missingCount === 0 && quietLines.length === 0) return null;

  return (
    <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      {missingCount > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-4)',
            border: '2px solid var(--color-accent-300)',
            background: 'var(--color-accent-100)',
            borderRadius: 6,
          }}
        >
          <p style={{ margin: 0, maxWidth: '60ch', fontSize: 13, lineHeight: 1.5, color: 'var(--color-accent-800)' }}>
            <strong>{missingCount} ảnh không có trên thiết bị này.</strong> Bố cục được mở lại từ tài khoản của bạn,
            nhưng tệp ảnh vẫn nằm ở thiết bị đã tải chúng lên. {missingCount} ô đó sẽ trống trong link chia sẻ và trong
            bản gửi xưởng.
            {syncPaused && ` ${SYNC_PAUSED_TEXT}`}
          </p>
          {firstMissingIdx >= 0 && (
            <button type="button" className="btn btn-secondary" onClick={() => onPickMissing(firstMissingIdx)}>
              Chọn lại ảnh
            </button>
          )}
        </div>
      )}
      {quietLines.map((line) => (
        <p key={line} style={{ margin: 0, fontSize: 12, color: 'var(--color-neutral-700)', textAlign: 'center' }}>
          {line}
        </p>
      ))}
    </div>
  );
}

const SYNC_PAUSED_TEXT =
  'Thay đổi trên máy này không đồng bộ lên tài khoản trong phiên này, để không ghi đè bản nháp còn ảnh gốc.';
