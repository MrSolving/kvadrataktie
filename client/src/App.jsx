import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import OwnerLayout from './components/OwnerLayout.jsx';
import AdminLayout from './components/AdminLayout.jsx';

import DashboardPage from './pages/DashboardPage.jsx';
import PlaceOrderPage from './pages/PlaceOrderPage.jsx';
import MyOrdersPage from './pages/MyOrdersPage.jsx';
import MyTradesPage from './pages/MyTradesPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import NewsPage from './pages/NewsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import OrderDepthPage from './pages/OrderDepthPage.jsx';
import VotingPage from './pages/VotingPage.jsx';
import AdminVotingPage from './pages/admin/AdminVotingPage.jsx';

import AdminOverviewPage from './pages/admin/AdminOverviewPage.jsx';
import AdminOwnersPage from './pages/admin/AdminOwnersPage.jsx';
import AdminPeriodsPage from './pages/admin/AdminPeriodsPage.jsx';
import AdminLotSizePage from './pages/admin/AdminLotSizePage.jsx';
import AdminNewsPage from './pages/admin/AdminNewsPage.jsx';
import AdminCalendarPage from './pages/admin/AdminCalendarPage.jsx';
import AdminEuroclearPage from './pages/admin/AdminEuroclearPage.jsx';

function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 48 }}>Laddar…</div>;
  if (!user) return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage variant="owner" />} />
      <Route path="/admin/login" element={<LoginPage variant="admin" />} />

      <Route path="/dashboard" element={<ProtectedRoute role="owner"><OwnerLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="order" element={<PlaceOrderPage />} />
        <Route path="mina-ordrar" element={<MyOrdersPage />} />
        <Route path="affarer" element={<MyTradesPage />} />
        <Route path="orderdjup" element={<OrderDepthPage />} />
        <Route path="omrostningar" element={<VotingPage />} />
        <Route path="kalender" element={<CalendarPage />} />
        <Route path="nyheter" element={<NewsPage />} />
        <Route path="profil" element={<ProfilePage />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
        <Route index element={<AdminOverviewPage />} />
        <Route path="agare" element={<AdminOwnersPage />} />
        <Route path="perioder" element={<AdminPeriodsPage />} />
        <Route path="handelsposter" element={<AdminLotSizePage />} />
        <Route path="nyheter" element={<AdminNewsPage />} />
        <Route path="kalender" element={<AdminCalendarPage />} />
        <Route path="euroclear" element={<AdminEuroclearPage />} />
        <Route path="omrostningar" element={<AdminVotingPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
