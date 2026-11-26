import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { PageSpinner } from '../../components/Skeleton.jsx';
import AdminLayout from './AdminLayout.jsx';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import Products from './Products.jsx';
import ProductEdit from './ProductEdit.jsx';
import Categories from './Categories.jsx';
import Inventory from './Inventory.jsx';
import Content from './Content.jsx';
import Users from './Users.jsx';
import AuditLog from './AuditLog.jsx';
import Account from './Account.jsx';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function Guard({ perm, children }) {
  const { session } = useAuth();
  const loc = useLocation();
  if (!session) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  if (perm && !session.permissions.includes(perm)) {
    return <div className="card p-10 text-center text-taupe">You don't have permission to view this page.</div>;
  }
  return children;
}

export default function AdminApp() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    document.title = 'Admin | Adcessories';
    api.get('/api/admin/auth/me').then(setSession).catch(() => setSession(null));
  }, []);

  const auth = {
    session,
    can: (p) => Boolean(session?.permissions.includes(p)),
    login: async (email, password) => setSession(await api.post('/api/admin/auth/login', { email, password })),
    logout: async () => {
      await api.post('/api/admin/auth/logout').catch(() => {});
      setSession(null);
    },
  };

  if (session === undefined) return <PageSpinner />;

  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        <Route path="login" element={session ? <Navigate to="/admin" replace /> : <Login />} />
        <Route element={<Guard><AdminLayout /></Guard>}>
          <Route index element={<Guard perm="dashboard:view"><Dashboard /></Guard>} />
          <Route path="products" element={<Products />} />
          <Route path="products/new" element={<Guard perm="products:write"><ProductEdit /></Guard>} />
          <Route path="products/:id" element={<ProductEdit />} />
          <Route path="categories" element={<Categories />} />
          <Route path="inventory" element={<Guard perm="inventory:write"><Inventory /></Guard>} />
          <Route path="content" element={<Guard perm="content:write"><Content /></Guard>} />
          <Route path="users" element={<Guard perm="users:manage"><Users /></Guard>} />
          <Route path="audit" element={<Guard perm="audit:view"><AuditLog /></Guard>} />
          <Route path="account" element={<Account />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </AuthContext.Provider>
  );
}
