import { beforeEach, describe, expect, it, vi } from 'vitest';

// addCartItem goi API that; thay bang mock de kiem rieng phan gop gio.
const addCartItem = vi.fn();
vi.mock('./cart', () => ({ addCartItem: (...args: unknown[]) => addCartItem(...args) }));

const {
  addGuestCartItem,
  readGuestCart,
  updateGuestCartItem,
  removeGuestCartItem,
  clearGuestCart,
  mergeGuestCart,
} = await import('./guestCart');

const STORAGE_KEY = 'business-store.guest-cart.v1';

function item(overrides: Record<string, unknown> = {}) {
  return {
    productId: 'p1',
    productName: 'Tranh sen',
    productSlug: 'tranh-sen',
    selectedVariant: null,
    selectedFrameOption: null,
    basePrice: 100,
    unitPrice: 100,
    quantity: 1,
    ...overrides,
  } as Parameters<typeof addGuestCartItem>[0];
}

beforeEach(() => {
  localStorage.clear();
  addCartItem.mockReset();
});

describe('gộp dòng trong giỏ khách vãng lai', () => {
  it('cộng dồn số lượng khi thêm lại đúng lựa chọn cũ', () => {
    addGuestCartItem(item({ quantity: 2 }));
    const cart = addGuestCartItem(item({ quantity: 3 }));

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(5);
    expect(cart.items[0].lineTotal).toBe(500);
  });

  it('tách dòng khi cùng sản phẩm nhưng khác số trang', () => {
    addGuestCartItem(item({ pageCount: 20 }));
    const cart = addGuestCartItem(item({ pageCount: 40 }));

    // Khoá gộp phải trùng unique index của server: 20 trang và 40 trang giá khác nhau.
    expect(cart.items).toHaveLength(2);
  });

  it('tách dòng khi khác mẫu photobook', () => {
    addGuestCartItem(item({ pageCount: 20, photobookTemplateCode: 'WEDDING' }));
    const cart = addGuestCartItem(item({ pageCount: 20, photobookTemplateCode: 'BABY' }));

    expect(cart.items).toHaveLength(2);
  });
});

describe('tính lại tổng', () => {
  it('cộng số lượng và thành tiền của mọi dòng', () => {
    addGuestCartItem(item({ quantity: 2 }));
    addGuestCartItem(item({ productId: 'p2', unitPrice: 50, quantity: 3 }));

    const cart = readGuestCart();
    expect(cart.totalQuantity).toBe(5);
    expect(cart.subtotal).toBe(2 * 100 + 3 * 50);
  });

  it('ép số lượng về khoảng 1..999 và làm tròn xuống', () => {
    addGuestCartItem(item());
    const id = readGuestCart().items[0].id;

    expect(updateGuestCartItem(id, 0).items[0].quantity).toBe(1);
    expect(updateGuestCartItem(id, 4.7).items[0].quantity).toBe(4);
    expect(updateGuestCartItem(id, 10_000).items[0].quantity).toBe(999);
  });
});

describe('dữ liệu hỏng trong localStorage', () => {
  it('bỏ qua giỏ sai phiên bản thay vì để trang chết', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99, items: [{ id: 'x' }] }));

    expect(readGuestCart().items).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('bỏ qua JSON hỏng', () => {
    localStorage.setItem(STORAGE_KEY, 'khong-phai-json');

    expect(readGuestCart().items).toEqual([]);
  });
});

describe('gộp sang giỏ trên máy chủ khi đăng nhập', () => {
  it('xoá khỏi máy khách từng dòng đã gửi thành công', async () => {
    addGuestCartItem(item());
    addGuestCartItem(item({ productId: 'p2' }));
    addCartItem.mockResolvedValue({});

    const result = await mergeGuestCart();

    expect(result).toEqual({ merged: 2, failed: 0 });
    expect(readGuestCart().items).toEqual([]);
  });

  it('giữ lại dòng bị máy chủ từ chối để khách thử lại', async () => {
    addGuestCartItem(item());
    addGuestCartItem(item({ productId: 'het-hang' }));
    addCartItem.mockImplementation((input: { productId: string }) =>
      input.productId === 'het-hang' ? Promise.reject(new Error('hết hàng')) : Promise.resolve({}));

    const result = await mergeGuestCart();

    expect(result).toEqual({ merged: 1, failed: 1 });
    expect(readGuestCart().items.map((line) => line.productId)).toEqual(['het-hang']);
  });

  it('chuyển kèm số trang, mẫu và thiết kế photobook', async () => {
    addGuestCartItem(item({ pageCount: 20, photobookTemplateCode: 'WEDDING', photobookDesignId: 'd1' }));
    addCartItem.mockResolvedValue({});

    await mergeGuestCart();

    // Thiếu ba trường này thì cuốn photobook lặng lẽ về mặc định ngay khi khách đăng nhập.
    expect(addCartItem).toHaveBeenCalledWith(expect.objectContaining({
      pageCount: 20, photobookTemplateCode: 'WEDDING', photobookDesignId: 'd1',
    }));
  });

  it('hai lời gọi song song chỉ gộp một lần', async () => {
    addGuestCartItem(item());
    addCartItem.mockResolvedValue({});

    const [first, second] = await Promise.all([mergeGuestCart(), mergeGuestCart()]);

    // StrictMode chạy effect hai lần; gộp hai lượt là cộng đôi giỏ trên máy chủ.
    expect(addCartItem).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  it('xoá sạch giỏ khách', () => {
    addGuestCartItem(item());
    expect(clearGuestCart().items).toEqual([]);
    expect(removeGuestCartItem('khong-co').items).toEqual([]);
  });
});
