import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DialogProvider } from './context/DialogContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Users from './pages/Users';
import ActivityLogs from './pages/ActivityLogs';
import Services from './pages/Services';
import Categories from './pages/Categories';
import Gallery from './pages/Gallery';
import FeaturedPhotos from './pages/FeaturedPhotos';
import Chat from './pages/Chat';

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="users" element={<Users />} />
              <Route path="activity-logs" element={<ActivityLogs />} />
              <Route path="customers" element={<Navigate to="/users?role=customer" replace />} />
              <Route path="services" element={<Services />} />
              <Route path="categories" element={<Categories />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="featured-photos" element={<FeaturedPhotos />} />
              <Route path="chat" element={<Chat />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </DialogProvider>
    </AuthProvider>
  );
}
