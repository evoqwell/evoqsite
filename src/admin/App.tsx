import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminShell } from './shell/AdminShell';
import { LoginScreen } from './shell/LoginScreen';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { PromosPage } from './pages/PromosPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

export function App() {
  return (
    <Routes>
      <Route path="/admin" element={<LoginScreen />} />
      <Route path="/admin.html" element={<Navigate to="/admin" replace />} />
      <Route element={<AdminShell />}>
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/products" element={<ProductsPage />} />
        <Route path="/admin/promos" element={<PromosPage />} />
        <Route path="/admin/orders" element={<OrdersPage />} />
        <Route path="/admin/orders/:id" element={<OrderDetailPage />} />
        <Route path="/admin/analytics" element={<AnalyticsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
