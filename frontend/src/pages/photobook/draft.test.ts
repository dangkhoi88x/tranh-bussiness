import { describe, expect, it, vi } from 'vitest';
import { clamp, draftImages, hydrateDraftSpreads, makeSpreads, pickNewerDraft } from './draft';
import type { PhotobookTemplate } from '../../data/photobookTemplates';
import type { StoredPhotobookDraft } from '../../data/photobookDraft';

const template = {
  id: 'tu-do',
  layoutCycle: ['full-bleed', 'duo'],
  spreadColors: ['#ffffff', '#f5f5f5'],
  presetCaptions: [{ spreadIndex: 1, text: 'Chuyện của chúng mình', fontSize: 24, color: '#1a1a1a', align: 'center', fontFamily: 'Lora' }],
} as unknown as PhotobookTemplate;

describe('makeSpreads', () => {
  it('lặp vòng bố cục và màu nền của mẫu', () => {
    const spreads = makeSpreads(4, [], template);

    expect(spreads.map((s) => s.layoutCode)).toEqual(['full-bleed', 'duo', 'full-bleed', 'duo']);
    expect(spreads.map((s) => s.backgroundColor)).toEqual(['#ffffff', '#f5f5f5', '#ffffff', '#f5f5f5']);
    expect(spreads.map((s) => s.position)).toEqual([1, 2, 3, 4]);
  });

  it('giữ nguyên các trang đôi đã có khi khách tăng số trang', () => {
    const before = makeSpreads(2, [], template);
    before[0].layoutCode = 'khach-tu-chon';

    const after = makeSpreads(4, before, template);

    // Đổi số trang mà dựng lại từ đầu là xoá sạch công sắp ảnh của khách.
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    expect(after).toHaveLength(4);
  });

  it('đặt sẵn chú thích mẫu vào đúng trang đôi đã khai báo', () => {
    const spreads = makeSpreads(3, [], template);

    expect(spreads[0].captions).toEqual([]);
    expect(spreads[1].captions[0]).toMatchObject({ text: 'Chuyện của chúng mình', fontFamily: 'Lora' });
    expect(spreads[2].captions).toEqual([]);
  });

  it('cấp id khác nhau cho từng chú thích', () => {
    const [, second] = makeSpreads(2, [], template);
    const [, otherSecond] = makeSpreads(2, [], template);

    expect(second.captions[0].id).not.toBe(otherSecond.captions[0].id);
  });
});

describe('hydrateDraftSpreads', () => {
  const storedDraft = {
    spreads: [{
      position: 1,
      layoutCode: 'duo',
      slots: [
        { imageId: 'anh-1', zoom: 9, panX: -5, panY: 0.4 },
        { imageId: 'anh-thieu', zoom: 1, panX: 0, panY: 0 },
      ],
      captions: [{ id: 'c1', text: 'Hè 2026', x: 0.5, y: 0.5, fontSize: 20, color: '#000', bold: false, align: 'center' }],
    }],
  } as unknown as StoredPhotobookDraft;

  it('ép zoom và pan về khoảng hợp lệ', () => {
    const spreads = hydrateDraftSpreads(storedDraft, new Map(), () => {});

    expect(spreads[0].slots[0].zoom).toBe(3);
    expect(spreads[0].slots[0].panX).toBe(-1);
    expect(spreads[0].slots[0].panY).toBeCloseTo(0.4);
  });

  it('giữ imageId khi máy này không có sẵn ảnh', () => {
    const spreads = hydrateDraftSpreads(storedDraft, new Map(), () => {});

    // Xoá imageId ở đây thì lần tự lưu sau sẽ biến ô có ảnh thành ô trống trên bản nháp chung.
    expect(spreads[0].slots[1].imageId).toBe('anh-thieu');
    expect(spreads[0].slots[1].file).toBeNull();
  });

  it('tạo preview và báo lại để nơi gọi thu hồi URL', () => {
    const file = new File(['x'], 'anh.jpg', { type: 'image/jpeg' });
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:anh-1' });
    const tracked: string[] = [];

    const spreads = hydrateDraftSpreads(storedDraft, new Map([['anh-1', file]]), (url) => tracked.push(url));

    expect(spreads[0].slots[0].preview).toBe('blob:anh-1');
    expect(tracked).toEqual(['blob:anh-1']);
    vi.unstubAllGlobals();
  });

  it('điền mặc định cho bản nháp cũ thiếu phông chữ và màu nền', () => {
    const spreads = hydrateDraftSpreads(storedDraft, new Map(), () => {});

    expect(spreads[0].captions[0].fontFamily).toBe('Archivo');
    expect(spreads[0].backgroundColor).toBe('#ffffff');
  });
});

describe('draftImages', () => {
  it('chỉ lấy ô vừa có id vừa có tệp', () => {
    const file = new File(['x'], 'a.jpg');
    const spreads = [{
      position: 1, layoutCode: 'duo', captions: [], backgroundColor: '#fff',
      slots: [
        { imageId: 'co-du', file, preview: null, zoom: 1, panX: 0, panY: 0 },
        { imageId: 'thieu-tep', file: null, preview: null, zoom: 1, panX: 0, panY: 0 },
        { imageId: null, file, preview: null, zoom: 1, panX: 0, panY: 0 },
      ],
    }];

    expect(draftImages(spreads)).toEqual([{ id: 'co-du', file }]);
  });
});

describe('pickNewerDraft', () => {
  const local = { updatedAt: 100 } as never;
  const server = { updatedAt: 200 } as never;

  it('chọn bản mới hơn giữa máy khách và máy chủ', () => {
    expect(pickNewerDraft(local, server)).toEqual({ draft: server, source: 'server' });
    expect(pickNewerDraft(server, local)).toEqual({ draft: server, source: 'local' });
  });

  it('dùng bản còn lại khi chỉ có một bên', () => {
    expect(pickNewerDraft(local, null)).toEqual({ draft: local, source: 'local' });
    expect(pickNewerDraft(null, server)).toEqual({ draft: server, source: 'server' });
    expect(pickNewerDraft(null, null)).toBeNull();
  });
});

describe('clamp', () => {
  it('giữ giá trị trong khoảng', () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(-5, 1, 3)).toBe(1);
    expect(clamp(2, 1, 3)).toBe(2);
  });
});
