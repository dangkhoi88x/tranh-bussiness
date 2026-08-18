// defineConfig lấy từ vitest/config để khoá `test` bên dưới được TypeScript chấp nhận;
// bản của 'vite' không biết khoá này và `tsc -b` sẽ báo lỗi lúc build.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    // jsdom vì phần lớn logic được kiểm ở đây chạm localStorage, sessionStorage hoặc fetch.
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Nạp matcher jest-dom cho test component; test api/data không dùng tới nhưng cũng không tốn gì.
    setupFiles: ['src/test/setup.ts'],
    // clearMocks xoá lịch sử gọi trước mỗi test; thiếu nó thì số lần gọi cộng dồn giữa các
    // ca và những khẳng định kiểu "chỉ làm mới token một lần" báo sai.
    clearMocks: true,
    restoreMocks: true,
  },
})
