import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RouteGuards'
import { ForbiddenPage } from './pages/ForbiddenPage'
import { AccountPage } from './pages/AccountPage'
import { AuthPage } from './pages/AuthPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { GoogleCallbackPage } from './pages/GoogleCallbackPage'
import { HomePage } from './pages/HomePage'
import { ProductPage } from './pages/ProductPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { CategoryPage } from './pages/CategoryPage'
import { PhotobookPage } from './pages/PhotobookPage'
import { MyOrdersPage } from './pages/MyOrdersPage'
import { CustomPrintPage } from './pages/CustomPrintPage'
import { SearchPage } from './pages/SearchPage'
import { WishlistPage } from './pages/WishlistPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { AboutPage, ContactPage, PolicyPage, SizesAndPricingPage } from './pages/StaticPages'
import { NotFoundPage } from './pages/NotFoundPage'
import './App.css'

const AdminArea = lazy(() => import('./pages/AdminArea'))

/** Nhận một named export và trả về component tải chậm kèm màn chờ riêng. */
function lazyPage<K extends string>(
  load: () => Promise<Record<K, React.ComponentType>>,
  name: K,
  loadingLabel: string,
) {
  // Ép về kiểu cụ thể: giữ nguyên Record<K, ...>[K] thì TypeScript hoãn giải kiểu và
  // không xác nhận được <Loaded /> gọi không tham số.
  const Loaded = lazy(async () => ({ default: (await load())[name] as React.ComponentType }))
  return function LazyRoute() {
    return <Suspense fallback={<main className="page-loading">{loadingLabel}</main>}><Loaded /></Suspense>
  }
}

// Trình dựng photobook là phần nặng nhất của storefront nhưng chỉ ai thực sự làm sách mới
// mở tới. Tách khỏi bundle chính để người vào xem tranh không phải tải nó.
const PhotobookDetailRoute = lazyPage(() => import('./pages/PhotobookDetailPage'), 'PhotobookDetailPage', 'Đang tải trình dựng photobook…')
const PhotobookProjectRoute = lazyPage(() => import('./pages/PhotobookProjectPage'), 'PhotobookProjectPage', 'Đang tải cuốn photobook…')
const PhotobookArrangementRoute = lazyPage(() => import('./pages/PhotobookArrangementPage'), 'PhotobookArrangementPage', 'Đang tải bản dàn trang…')
const SharePreviewLoader = lazyPage(() => import('./pages/PhotobookSharePreviewPage'), 'PhotobookSharePreviewPage', 'Đang tải bản xem trước…')

function AdminAreaLoader() {
  return <Suspense fallback={<main className="page-loading">Đang tải khu vực quản trị…</main>}><AdminArea /></Suspense>
}

function App() {
  return <Routes>
    <Route path="/auth" element={<AuthPage />} />
    <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
    {/* Email đặt lại mật khẩu trỏ tới /dat-lai-mat-khau; giữ thêm /reset-password để các
        liên kết đã gửi trước đó vẫn mở đúng trang. */}
    <Route path="/dat-lai-mat-khau" element={<ResetPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route element={<RequireAuth />}>
      <Route path="/account" element={<AccountPage />} />
      <Route path="/admin/*" element={<AdminAreaLoader />} />
      <Route path="/403" element={<ForbiddenPage />} />
    </Route>
    <Route path="/" element={<HomePage />} />
    <Route path="/tranh/:slug" element={<ProductPage />} />
    {/* Không bọc RequireAuth: khách chưa đăng nhập vẫn mở được giỏ và thấy lời mời đăng
        nhập, thay vì bị đá sang /auth mà không hiểu vì sao. */}
    <Route path="/gio-hang" element={<CartPage />} />
    <Route path="/thanh-toan" element={<CheckoutPage />} />
    <Route path="/don-hang-cua-toi" element={<MyOrdersPage />} />
    <Route path="/don-hang-cua-toi/:orderId" element={<MyOrdersPage />} />
    <Route path="/danh-muc/:slug" element={<CategoryPage />} />
    <Route path="/photobook" element={<PhotobookPage />} />
    {/* Photobook bán theo khổ × số trang nên không dùng chung trang với tranh canvas;
        /tranh/:slug tự chuyển sang đây nếu sản phẩm bán theo trang. */}
    <Route path="/photobook/:slug" element={<PhotobookDetailRoute />} />
    {/* Không bọc RequireAuth: trang tự mời đăng nhập, giống /gio-hang. */}
    <Route path="/xem-truoc/:token" element={<SharePreviewLoader />} />
    <Route path="/photobook-cua-toi/:projectId" element={<PhotobookProjectRoute />} />
    <Route path="/photobook-cua-toi/:projectId/sap-xep" element={<PhotobookArrangementRoute />} />
    <Route path="/dat-in" element={<CustomPrintPage />} />
    <Route path="/tim-kiem" element={<SearchPage />} />
    <Route path="/yeu-thich" element={<WishlistPage />} />
    <Route path="/thong-bao" element={<NotificationsPage />} />
    <Route path="/kho-va-gia" element={<SizesAndPricingPage />} />
    <Route path="/gioi-thieu" element={<AboutPage />} />
    <Route path="/lien-he" element={<ContactPage />} />
    <Route path="/chinh-sach-doi-tra" element={<PolicyPage />} />
    <Route path="/chinh-sach-van-chuyen" element={<PolicyPage />} />
    <Route path="/chinh-sach-thanh-toan" element={<PolicyPage />} />
    <Route path="/chinh-sach-bao-mat" element={<PolicyPage />} />
    {/* Link /thu-tren-tuong chưa được triển khai và mọi URL công khai không khớp đều
        phải hiện 404; không redirect về trang chủ để khách và crawler nhận biết lỗi. */}
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
}

export default App
