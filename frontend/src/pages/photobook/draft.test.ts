import { describe, expect, it, vi } from 'vitest';
import {
  clamp,
  draftImages,
  hydrateDraftSpreads,
  makeSpreads,
  pickNewerDraft,
  firstSpreadWithMissingImage,
  missingImageIds,
  slotCapacityOf,
  slotImageMissing,
  spreadHasPlacedImages,
  suggestPageCountForTemplate,
  uploadableImages,
  uploadableSpreads,
} from './draft';
import { PHOTOBOOK_TEMPLATES, type PhotobookTemplate } from '../../data/photobookTemplates';
import { layoutByCode } from '../../data/spreadLayouts';
import type { StoredPhotobookDraft } from '../../data/photobookDraft';

const template = {
  id: 'tu-do',
  layoutCycle: ['full-bleed', 'duo'],
  spreadColors: ['#ffffff', '#f5f5f5'],
  presetCaptions: [
    {
      spreadIndex: 1,
      text: 'Chuyện của chúng mình',
      fontSize: 24,
      color: '#1a1a1a',
      align: 'center',
      fontFamily: 'Lora',
    },
  ],
} as unknown as PhotobookTemplate;

describe('slotCapacityOf', () => {
  it('cộng số ô theo đúng chu kỳ bố cục mà makeSpreads dùng', () => {
    const twoSlotCycle = { layoutCycle: ['DOI_CAN', 'BON_O'] } as unknown as PhotobookTemplate;

    // 20 trang = 10 trang đôi = DOI_CAN(2) và BON_O(4) xen kẽ, mỗi loại 5 lần.
    expect(slotCapacityOf(twoSlotCycle, 20)).toBe(5 * 2 + 5 * 4);
    expect(slotCapacityOf(twoSlotCycle, 4)).toBe(2 + 4);
    expect(slotCapacityOf(twoSlotCycle, 0)).toBe(0);
  });

  it('khớp với số ô đếm được từ chính các trang đôi makeSpreads dựng ra', () => {
    for (const tpl of PHOTOBOOK_TEMPLATES) {
      const built = makeSpreads(10, [], tpl).reduce(
        (total, spread) => total + layoutByCode(spread.layoutCode).slots.length,
        0,
      );

      expect(slotCapacityOf(tpl, 20)).toBe(built);
    }
  });

  it('không chủ đề nào thưa ô đến mức cuốn 20 trang không đủ chỗ đặt ảnh', () => {
    // Từng có chủ đề chỉ 15 ô cho 10 trang đôi (1,5 tấm mỗi trang đôi) trong khi trang sản phẩm
    // bảo khách chuẩn bị 60–80 tấm. Chặn ở 25 để không ai vô tình seed lại một chu kỳ thưa như vậy.
    for (const tpl of PHOTOBOOK_TEMPLATES) {
      expect(slotCapacityOf(tpl, 20), `chủ đề ${tpl.id} quá thưa ô`).toBeGreaterThanOrEqual(25);
    }
  });
});

describe('suggestPageCountForTemplate', () => {
  const options = [
    { pageCount: 20, price: 0 },
    { pageCount: 40, price: 0 },
  ];
  const tpl = { layoutCycle: ['BON_O'] } as unknown as PhotobookTemplate;

  it('gợi ý mức trang đầu tiên đủ ô cho số ảnh khách có', () => {
    // BON_O = 4 ô: 20 trang → 40 ô, 40 trang → 80 ô.
    expect(suggestPageCountForTemplate(30, options, tpl)).toBe(20);
    expect(suggestPageCountForTemplate(60, options, tpl)).toBe(40);
  });

  it('trả về mức lớn nhất khi không mức nào chứa đủ, và null khi chưa nhập', () => {
    expect(suggestPageCountForTemplate(500, options, tpl)).toBe(40);
    expect(suggestPageCountForTemplate(0, options, tpl)).toBeNull();
  });
});

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
    spreads: [
      {
        position: 1,
        layoutCode: 'duo',
        slots: [
          { imageId: 'anh-1', zoom: 9, panX: -5, panY: 0.4 },
          { imageId: 'anh-thieu', zoom: 1, panX: 0, panY: 0 },
        ],
        captions: [
          { id: 'c1', text: 'Hè 2026', x: 0.5, y: 0.5, fontSize: 20, color: '#000', bold: false, align: 'center' },
        ],
      },
    ],
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
    const spreads = [
      {
        position: 1,
        layoutCode: 'duo',
        captions: [],
        backgroundColor: '#fff',
        slots: [
          { imageId: 'co-du', file, preview: null, zoom: 1, panX: 0, panY: 0 },
          { imageId: 'thieu-tep', file: null, preview: null, zoom: 1, panX: 0, panY: 0 },
          { imageId: null, file, preview: null, zoom: 1, panX: 0, panY: 0 },
        ],
      },
    ];

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

describe('uploadableSpreads / uploadableImages', () => {
  const file = new File(['x'], 'a.jpg');
  const spreads = [
    {
      position: 1,
      layoutCode: 'duo',
      captions: [
        {
          id: 'c1',
          text: 'Gia đình mình',
          x: 0.5,
          y: 0.5,
          fontSize: 4,
          color: '#1a1a1a',
          bold: false,
          align: 'center' as const,
          fontFamily: 'Lora',
        },
      ],
      backgroundColor: '#fff',
      slots: [
        { imageId: 'co-tep', file, preview: null, zoom: 2, panX: 0.5, panY: -0.5 },
        { imageId: 'may-nay-khong-co-blob', file: null, preview: null, zoom: 1, panX: 0, panY: 0 },
      ],
    },
  ];

  it('bỏ tham chiếu ảnh mà máy này không còn giữ tệp', () => {
    const payload = uploadableSpreads(spreads);

    expect(payload[0].slots.map((slot) => slot.imageId)).toEqual(['co-tep', null]);
    expect(payload[0].captions[0].text).toBe('Gia đình mình');
    expect(payload[0].backgroundColor).toBe('#fff');
  });

  it('tập imageId trong metadata trùng khít tập ảnh tải lên — điều kiện backend bắt buộc', () => {
    const referenced = uploadableSpreads(spreads)
      .flatMap((spread) => spread.slots)
      .flatMap((slot) => (slot.imageId ? [slot.imageId] : []));

    expect(new Set(referenced)).toEqual(new Set(uploadableImages(spreads).keys()));
  });

  it('gộp ảnh dùng lại ở nhiều ô thành một lần tải lên', () => {
    const reused = [
      {
        ...spreads[0],
        slots: [
          { imageId: 'chung', file, preview: null, zoom: 1, panX: 0, panY: 0 },
          { imageId: 'chung', file, preview: null, zoom: 1, panX: 0, panY: 0 },
        ],
      },
    ];

    expect([...uploadableImages(reused).keys()]).toEqual(['chung']);
  });
});

describe('ảnh không có trên thiết bị này', () => {
  const file = new File(['x'], 'a.jpg');
  const slot = (imageId: string | null, withFile: boolean) => ({
    imageId,
    file: withFile ? file : null,
    preview: null,
    zoom: 1,
    panX: 0,
    panY: 0,
  });
  const spread = (...slots: ReturnType<typeof slot>[]) => ({
    position: 1,
    layoutCode: 'duo',
    captions: [],
    backgroundColor: '#fff',
    slots,
  });

  it('phân biệt ô thiếu tệp với ô thật sự trống', () => {
    expect(slotImageMissing(slot('a', false))).toBe(true);
    expect(slotImageMissing(slot('a', true))).toBe(false);
    expect(slotImageMissing(slot(null, false))).toBe(false);
  });

  it('đếm ảnh thiếu theo id, không đếm trùng khi một ảnh nằm ở nhiều ô', () => {
    const spreads = [spread(slot('a', false), slot('a', false)), spread(slot('b', false), slot('c', true))];

    expect(missingImageIds(spreads).sort()).toEqual(['a', 'b']);
  });

  it('chỉ tới spread đầu tiên còn ô thiếu tệp', () => {
    const spreads = [spread(slot('a', true)), spread(slot(null, false)), spread(slot('b', false))];

    expect(firstSpreadWithMissingImage(spreads)).toBe(2);
    expect(firstSpreadWithMissingImage([spread(slot('a', true))])).toBe(-1);
  });

  it('spread có ảnh đã đặt vẫn tính là "có ảnh" dù máy này không giữ tệp', () => {
    // Nếu xét theo file, đổi chủ đề ở thiết bị khác sẽ dựng lại bố cục và xoá sạch imageId.
    expect(spreadHasPlacedImages(spread(slot('a', false)))).toBe(true);
    expect(spreadHasPlacedImages(spread(slot(null, false)))).toBe(false);
  });
});
