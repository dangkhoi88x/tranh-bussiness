import { addCartItem, type AddCartItemInput, type Cart, type CartItem } from './cart';

const STORAGE_KEY = 'business-store.guest-cart.v1';
const CHANGE_EVENT = 'business-store:guest-cart-changed';
const GUEST_CART_ID = 'guest';
const MAX_QUANTITY = 999;
let mergePromise: Promise<GuestCartMergeResult> | null = null;

/**
 * Snapshot tối thiểu để khách vẫn xem, sửa và xoá giỏ trước khi đăng nhập.
 * Giá này chỉ là giá tham khảo ở máy khách; CartService luôn tính lại giá và tồn
 * kho hiện tại khi chuyển từng dòng sang giỏ server.
 */
export type GuestCartItemInput = AddCartItemInput & Omit<CartItem, 'id' | 'quantity' | 'lineTotal'>;

export type GuestCartMergeResult = {
  merged: number;
  failed: number;
};

/**
 * Khoá gộp dòng phải trùng khớp với khoá bên server (index uq_cart_items_selection): cùng
 * một cuốn photobook ở 20 trang và 40 trang là hai dòng khác nhau vì giá khác nhau.
 */
function itemId(input: Pick<AddCartItemInput, 'productId' | 'productVariantId' | 'productFrameOptionId' | 'pageCount'>) {
  return [
    input.productId,
    input.productVariantId ?? '',
    input.productFrameOptionId ?? '',
    input.pageCount ?? '',
  ].join(':');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStoredItem(value: unknown): value is CartItem {
  if (!isObject(value)) return false;
  const stringFields = ['id', 'productId', 'productName', 'productSlug'];
  const numberFields = ['basePrice', 'unitPrice', 'quantity', 'lineTotal'];
  return stringFields.every((key) => typeof value[key] === 'string')
    && numberFields.every((key) => typeof value[key] === 'number' && Number.isFinite(value[key] as number))
    && (value.selectedVariant === null || isObject(value.selectedVariant))
    && (value.selectedFrameOption === null || isObject(value.selectedFrameOption));
}

function normalize(items: CartItem[]): CartItem[] {
  return items.map((item) => {
    const quantity = Math.min(MAX_QUANTITY, Math.max(1, Math.floor(item.quantity)));
    return { ...item, quantity, lineTotal: item.unitPrice * quantity };
  });
}

function storedItems(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const payload = JSON.parse(raw) as { version?: unknown; items?: unknown };
    if (payload.version !== 1 || !Array.isArray(payload.items) || !payload.items.every(isStoredItem)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return normalize(payload.items);
  } catch {
    return [];
  }
}

function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function save(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  if (items.length === 0) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: normalize(items) }));
  notifyChange();
}

function asCart(items: CartItem[]): Cart {
  const normalized = normalize(items);
  return {
    id: GUEST_CART_ID,
    items: normalized,
    totalQuantity: normalized.reduce((total, item) => total + item.quantity, 0),
    subtotal: normalized.reduce((total, item) => total + item.lineTotal, 0),
  };
}

export function readGuestCart(): Cart {
  return asCart(storedItems());
}

export function addGuestCartItem(input: GuestCartItemInput): Cart {
  const items = storedItems();
  const id = itemId(input);
  const existing = items.find((item) => item.id === id);
  if (existing) {
    existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + input.quantity);
    existing.lineTotal = existing.unitPrice * existing.quantity;
  } else {
    items.push({
      id,
      productId: input.productId,
      productName: input.productName,
      productSlug: input.productSlug,
      selectedVariant: input.selectedVariant,
      basePrice: input.basePrice,
      selectedFrameOption: input.selectedFrameOption,
      pageCount: input.pageCount ?? null,
      unitPrice: input.unitPrice,
      quantity: Math.min(MAX_QUANTITY, Math.max(1, input.quantity)),
      lineTotal: input.unitPrice * Math.min(MAX_QUANTITY, Math.max(1, input.quantity)),
    });
  }
  save(items);
  return asCart(items);
}

export function updateGuestCartItem(id: string, quantity: number): Cart {
  const items = storedItems().map((item) => item.id === id
    ? { ...item, quantity: Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity))) }
    : item);
  save(items);
  return asCart(items);
}

export function removeGuestCartItem(id: string): Cart {
  const items = storedItems().filter((item) => item.id !== id);
  save(items);
  return asCart(items);
}

export function clearGuestCart(): Cart {
  save([]);
  return asCart([]);
}

/**
 * Gộp tuần tự để một dòng đã gửi thành công được xoá ngay khỏi localStorage.
 * Dòng bị backend từ chối (hết hàng, ngừng bán, khung không còn phù hợp...) được
 * giữ lại để không mất lựa chọn của khách và có thể thử lại từ trang giỏ.
 */
async function mergeItems(): Promise<GuestCartMergeResult> {
  let merged = 0;
  let failed = 0;

  for (const item of storedItems()) {
    try {
      await addCartItem({
        productId: item.productId,
        productVariantId: item.selectedVariant?.id ?? null,
        productFrameOptionId: item.selectedFrameOption?.id ?? null,
        // Không có dòng này thì photobook trong giỏ khách vãng lai bị backend từ chối
        // khi đăng nhập, và dòng đó lặng lẽ rơi vào nhánh failed.
        pageCount: item.pageCount ?? null,
        quantity: item.quantity,
      });
      removeGuestCartItem(item.id);
      merged += 1;
    } catch {
      failed += 1;
    }
  }

  return { merged, failed };
}

export function mergeGuestCart(): Promise<GuestCartMergeResult> {
  // AuthProvider có thể chạy effect hai lần trong StrictMode; đồng thời người dùng
  // cũng có thể bấm "Thử lại". Chỉ một lần gộp trên mỗi tab để không cộng đôi server cart.
  if (!mergePromise) {
    mergePromise = mergeItems().finally(() => { mergePromise = null; });
  }
  return mergePromise;
}

export { CHANGE_EVENT as guestCartChangeEvent };
