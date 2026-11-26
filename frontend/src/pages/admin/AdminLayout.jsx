import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, Package, FolderTree, Boxes, FileText, Users, ScrollText, LogOut, Menu, ExternalLink, UserCircle } from 'lucide-react';
import { useAuth } from './AdminApp.jsx';

const ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, perm: 'dashboard:view', end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/inventory', label: 'Stock history', icon: Boxes, perm: 'inventory:write' },
  { to: '/admin/content', label: 'Site content', icon: FileText, perm: 'content:write' },
  { to: '/admin/users', label: 'Admin users', icon: Users, perm: 'users:manage' },
  { to: '/admin/audit', label: 'Activity log', icon: ScrollText, perm: 'audit:view' },
];

const ROLE_LABEL = { SUPER_ADMIN: 'Super Admin', STORE_MANAGER: 'Store Manager', INVENTORY_MANAGER: 'Inventory Manager', CONTENT_MANAGER: 'Content Manager' };

export default function AdminLayout() {
  const { session, can, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {ITEMS.filter((i) => !i.perm || can(i.perm)).map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${isActive ? 'bg-espresso text-warm' : 'text-espresso hover:bg-cream'}`}>
          <i.icon className="h-4 w-4" /> {i.label}
        </NavLink>
      ))}
      <div className="mt-auto space-y-1 border-t border-line pt-4">
        <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-taupe hover:bg-cream"><ExternalLink className="h-4 w-4" /> View store</a>
        <NavLink to="/admin/account" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-taupe hover:bg-cream"><UserCircle className="h-4 w-4" /> My account</NavLink>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-taupe hover:bg-cream"><LogOut className="h-4 w-4" /> Sign out</button>
      </div>
    </nav>
  );

  const brand = (
    <div className="mb-8 px-3">
      <Link to="/admin" className="font-serif text-xl">Adcessories</Link>
      <p className="mt-0.5 text-xs text-taupe">{session.admin.name} · {ROLE_LABEL[session.admin.role]}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-warm">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-line bg-ivory p-5 lg:flex">{brand}{nav}</aside>
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 bg-espresso/30 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.25 }} className="flex h-full w-72 flex-col bg-ivory p-5" onClick={(e) => e.stopPropagation()}>
              {brand}{nav}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-line bg-warm/90 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <span className="ml-3 font-serif text-lg">Admin</span>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-taupe">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
