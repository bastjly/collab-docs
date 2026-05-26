import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="border-b bg-white px-6 py-3 flex items-center justify-between">
      <Link to="/documents" className="font-semibold text-lg">Collab Docs</Link>
      <nav className="flex items-center gap-4">
        {isAdmin && (
          <Link to="/admin" className="text-sm text-gray-600 hover:text-gray-900">
            Administration
          </Link>
        )}
        <Link to="/profile" className="text-sm text-gray-600 hover:text-gray-900">
          {user?.name ?? '…'}
        </Link>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          Déconnexion
        </button>
      </nav>
    </header>
  );
}
