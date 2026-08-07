import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { RequireAuth, RequirePermission } from './components/RouteGuards'
import { AdminDashboard, AdminIndex, AccountPage, ForbiddenPage } from './pages/AdminPages'
import { AuthPage } from './pages/AuthPage'
import { CategoriesPage, FramesPage, ProductDetailPage } from './pages/CatalogPages'
import { MaterialsPage } from './pages/MaterialPages'
import { ArtSizesPage } from './pages/ArtSizePages'
import { CustomOrdersPage, OrderDetailPage } from './pages/OperationsPages'
import { ProductsSearchPage } from './pages/CatalogFilterPage'
import { OrdersSearchPage, PaymentsSearchPage } from './pages/OperationsFilterPages'
import { PromotionsPage } from './pages/PromotionPages'
import { ShipmentsPage } from './pages/ShipmentPages'
import { StaffPage } from './pages/StaffPages'
import { HomePage } from './pages/HomePage'
import { ProductPage } from './pages/ProductPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { CategoryPage } from './pages/CategoryPage'
import { PhotobookPage } from './pages/PhotobookPage'
import './App.css'

function App() {
  return <Routes>
    <Route path="/auth" element={<AuthPage />} />
    <Route element={<RequireAuth />}>
      <Route path="/account" element={<AccountPage />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminIndex />} />
        <Route element={<RequirePermission permission="DASHBOARD_VIEW" />}><Route path="dashboard" element={<AdminDashboard />} /></Route>
        <Route element={<RequirePermission permission="CATEGORY_MANAGE" />}><Route path="categories" element={<CategoriesPage />} /></Route>
        <Route element={<RequirePermission permission="PRODUCT_MANAGE" />}><Route path="products" element={<ProductsSearchPage />} /><Route path="products/:productId" element={<ProductDetailPage />} /></Route>
        <Route element={<RequirePermission permission="PRODUCT_MANAGE" />}><Route path="materials" element={<MaterialsPage />} /></Route>
        <Route element={<RequirePermission permission="PRODUCT_MANAGE" />}><Route path="art-sizes" element={<ArtSizesPage />} /></Route>
        <Route element={<RequirePermission permission="FRAME_MANAGE" />}><Route path="frames" element={<FramesPage />} /></Route>
        <Route element={<RequirePermission permission="ORDER_MANAGE" />}><Route path="orders" element={<OrdersSearchPage />} /><Route path="orders/:orderId" element={<OrderDetailPage />} /></Route>
        <Route element={<RequirePermission permission="PAYMENT_MANAGE" />}><Route path="payments" element={<PaymentsSearchPage />} /></Route>
        <Route element={<RequirePermission permission="CUSTOM_ORDER_MANAGE" />}><Route path="custom-orders" element={<CustomOrdersPage />} /></Route>
        <Route element={<RequirePermission permission="SHIPMENT_MANAGE" />}><Route path="shipments" element={<ShipmentsPage />} /></Route>
        <Route element={<RequirePermission permission="PROMOTION_MANAGE" />}><Route path="promotions" element={<PromotionsPage />} /></Route>
        <Route element={<RequirePermission permission="USER_MANAGE" />}><Route path="users" element={<StaffPage />} /></Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
      <Route path="/403" element={<ForbiddenPage />} />
    </Route>
    <Route path="/" element={<HomePage />} />
    <Route path="/tranh/:slug" element={<ProductPage />} />
    {/* Không bọc RequireAuth: khách chưa đăng nhập vẫn mở được giỏ và thấy lời mời đăng
        nhập, thay vì bị đá sang /auth mà không hiểu vì sao. */}
    <Route path="/gio-hang" element={<CartPage />} />
    <Route path="/thanh-toan" element={<CheckoutPage />} />
    <Route path="/danh-muc/:slug" element={<CategoryPage />} />
    <Route path="/photobook" element={<PhotobookPage />} />
    {/*
      Trang công khai nào chưa làm thì về trang chủ. Trước đây rơi vào /admin, tức là
      khách bấm một link chưa có (vd /danh-muc/...) bị đẩy thẳng vào form đăng nhập admin.

      Những đường dẫn header/footer đang trỏ tới mà chưa có route — dựng xong cái nào thì
      thêm <Route> ở đây và bỏ ghi chú ở component tương ứng:

        /dat-in          form đặt in theo yêu cầu (backend đã có custom order)
        /kho-va-gia      bảng khổ và giá
        /gioi-thieu      giới thiệu xưởng
        /lien-he         liên hệ
        /thu-tren-tuong  công cụ ướm tranh lên tường
        /chinh-sach-*    đổi trả và vận chuyển; nội dung hiện nằm trong tab
                         "Giao & đổi trả" của trang sản phẩm

      Riêng 4 link mạng xã hội ở footer cần URL thật của cửa hàng, không phải route.
    */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

export default App
