// Đăng ký matcher của jest-dom (toBeInTheDocument, toBeDisabled…) cho mọi test component.
import '@testing-library/jest-dom/vitest';

// --- Vá localStorage/sessionStorage cho môi trường jsdom ---
//
// Node 22 định nghĩa sẵn `globalThis.localStorage` như một API thử nghiệm, và nó luôn undefined
// khi chạy không kèm cờ `--localstorage-file`. Vitest copy các thuộc tính của jsdom window sang
// globalThis nhưng bỏ qua key nào **đã tồn tại** trên global và không nằm trong danh sách KEYS
// nội bộ của nó — `localStorage` rơi đúng vào trường hợp này, nên bản của jsdom không bao giờ
// được gắn vào và test thấy `localStorage === undefined`.
//
// Hệ quả trước khi vá: 12 test trong `src/api/guestCart.test.ts` fail với
// "Cannot read properties of undefined (reading 'clear')".
//
// jsdom window thật không còn tham chiếu được từ test (vitest đặt `window === globalThis`), nên
// cách chắc chắn nhất là cấp một Storage in-memory đúng chuẩn Web Storage.
class MemoryStorage implements Storage {
  #data = new Map<string, string>();

  get length() {
    return this.#data.size;
  }

  clear() {
    this.#data.clear();
  }

  getItem(key: string) {
    return this.#data.has(String(key)) ? this.#data.get(String(key))! : null;
  }

  key(index: number) {
    return [...this.#data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.#data.delete(String(key));
  }

  setItem(key: string, value: string) {
    // Web Storage ép mọi thứ về string; giữ đúng hành vi này để test không vô tình dựa vào
    // việc số/boolean được trả lại nguyên kiểu.
    this.#data.set(String(key), String(value));
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (!globalThis[name]) {
    Object.defineProperty(globalThis, name, {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    });
  }
}
