import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { RequirePermission } from '../components/RouteGuards';
import { PhotobookQueuePage } from './PhotobookQueuePage';
import { AdminDashboard, AdminIndex } from './AdminPages';
import { ArtSizesPage } from './ArtSizePages';
import { CategoriesPage, FramesPage, ProductDetailPage } from './CatalogPages';
import { ProductsSearchPage } from './CatalogFilterPage';
import { MaterialsPage } from './MaterialPages';
import { CustomOrdersPage, OrderDetailPage } from './OperationsPages';
import { OrdersSearchPage, PaymentsSearchPage } from './OperationsFilterPages';
import { PromotionsPage } from './PromotionPages';
import { ShipmentsPage } from './ShipmentPages';
import { StaffPage } from './StaffPages';
import { AdminOrderNotificationProvider } from '../contexts/AdminOrderNotificationContext';

/**
 * Toàn bộ màn quản trị nằm sau import động từ App.tsx. Các route con vẫn giữ guard
 * theo permission ở đúng vị trí cũ; chỉ thời điểm tải JavaScript thay đổi.
 */
export default function AdminArea() {
  return <AdminOrderNotificationProvider><Routes>
    <Route element={<AdminLayout />}>
      <Route index element={<AdminIndex />} />
      <Route element={<RequirePermission permission="DASHBOARD_VIEW" />}><Route path="dashboard" element={<AdminDashboard />} /></Route>
      <Route element={<RequirePermission permission="CATEGORY_MANAGE" />}><Route path="categories" element={<CategoriesPage />} /></Route>
      <Route element={<RequirePermission permission="PRODUCT_MANAGE" />}><Route path="products" element={<ProductsSearchPage />} /><Route path="products/:productId" element={<ProductDetailPage />} /></Route>
      <Route element={<RequirePermission permission="PRODUCT_MANAGE" />}><Route path="materials" element={<MaterialsPage />} /></Route>
      <Route element={<RequirePermission permission="PRODUCT_MANAGE" />}><Route path="art-sizes" element={<ArtSizesPage />} /></Route>
      <Route element={<RequirePermission permission="FRAME_MANAGE" />}><Route path="frames" element={<FramesPage />} /></Route>
      <Route element={<RequirePermission permission="ORDER_MANAGE" />}><Route path="orders" element={<OrdersSearchPage />} /><Route path="orders/:orderId" element={<OrderDetailPage />} /></Route>
      <Route element={<RequirePermission permission="PAYMENT_MANAGE" />}><Route path="payments" element={<PaymentsSearchPage />} /></Route>
      <Route element={<RequirePermission permission="CUSTOM_ORDER_MANAGE" />}><Route path="custom-orders" element={<CustomOrdersPage />} /><Route path="photobooks" element={<PhotobookQueuePage />} /></Route>
      <Route element={<RequirePermission permission="SHIPMENT_MANAGE" />}><Route path="shipments" element={<ShipmentsPage />} /></Route>
      <Route element={<RequirePermission permission="PROMOTION_MANAGE" />}><Route path="promotions" element={<PromotionsPage />} /></Route>
      <Route element={<RequirePermission permission="USER_MANAGE" />}><Route path="users" element={<StaffPage />} /></Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Route>
  </Routes></AdminOrderNotificationProvider>;
}
