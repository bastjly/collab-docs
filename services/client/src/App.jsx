import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginPage } from '@/pages/LoginPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { DocumentPage } from '@/pages/DocumentPage';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { token } = useAuth();
  return !token ? children : <Navigate to="/documents" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/documents" element={<PrivateRoute><DocumentsPage /></PrivateRoute>} />
          <Route path="/documents/:id" element={<PrivateRoute><DocumentPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/documents" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="bottom-right" />
    </AuthProvider>
  );
}
