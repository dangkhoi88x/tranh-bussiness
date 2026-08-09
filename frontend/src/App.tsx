import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './components/RouteGuards'
import { ForbiddenPage } from './pages/ForbiddenPage'
import { AccountPage } from './pages/AccountPage'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { ProductPage } from './pages/ProductPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { CategoryPage } from './pages/CategoryPage'
import { PhotobookPage } from './pages/PhotobookPage'
import { PhotobookDetailPage } from './pages/PhotobookDetailPage'
import { PhotobookProjectPage } from './pages/PhotobookProjectPage'
import { PhotobookArrangementPage } from './pages/PhotobookArrangementPage'
import { MyOrdersPage } from './pages/MyOrdersPage'
import { CustomPrintPage } from './pages/CustomPrintPage'
import { SearchPage } from './pages/SearchPage'
import { WishlistPage } from './pages/WishlistPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { AboutPage, ContactPage, PolicyPage, SizesAndPricingPage } from './pages/StaticPages'
import { NotFoundPage } from './pages/NotFoundPage'
import './App.css'

const AdminArea = lazy(() => import('./pages/AdminArea'))

function AdminAreaLoader() {
  return <Suspense fallback={<main className="page-loading">Đang tải khu vực quản trị…</main>}><AdminArea /></Suspense>
}

function App() {
  return <Routes>
    <Route path="/auth" element={<AuthPage />} />
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
    <Route path="/photobook/:slug" element={<PhotobookDetailPage />} />
    {/* Không bọc RequireAuth: trang tự mời đăng nhập, giống /gio-hang. */}
    <Route path="/photobook-cua-toi/:projectId" element={<PhotobookProjectPage />} />
    <Route path="/photobook-cua-toi/:projectId/sap-xep" element={<PhotobookArrangementPage />} />
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
