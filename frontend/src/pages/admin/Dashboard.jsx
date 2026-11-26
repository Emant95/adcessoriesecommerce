import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Eye, FileEdit, AlertTriangle, PackageX, Boxes, Wallet, FolderTree } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useFetch } from '../../lib/useFetch.js';
import { money, number, dateTime } from '../../lib/format.js';
import { Skeleton, ErrorState } from '../../components/Skeleton.jsx';
import { PageHeader } from './AdminLayout.jsx';

const MOVE_LABEL = { STOCK_IN: 'Stock in', STOCK_OUT: 'Stock out', RETURN: 'Return', DAMAGED: 'Damaged', ADJUSTMENT: 'Adjustment' };

function Kpi({ icon: Icon, label, value, tone = 'text-gold', to, i }) {
  const body = (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card h-full p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-taupe">{label}</p>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <p className="mt-3 font-serif text-3xl">{value}</p>
    </motion.div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function MiniList({ title, items, empty, render, link }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg">{title}</h2>
        {link}
      </div>
      {items.length === 0 ? <p className="py-6 text-center text-sm text-taupe">{empty}</p> : <ul className="divide-y divide-line">{items.map(render)}</ul>}
    </div>
  );
}

export default function Dashboard() {
  const { data, loading, error, reload } = useFetch('/api/admin/dashboard');
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }
  const k = data.kpis;
  const kpis = [
    [Package, 'Live products', number(k.published), 'text-gold', '/admin/products?status=PUBLISHED'],
    [FileEdit, 'Drafts', number(k.drafts), 'text-taupe', '/admin/products?status=DRAFT'],
    [AlertTriangle, 'Low stock', number(k.lowStock), 'text-amber-600', '/admin/products?stock=low'],
    [PackageX, 'Out of stock', number(k.outOfStock), 'text-red-600', '/admin/products?stock=out'],
    [FolderTree, 'Active categories', number(k.categories), 'text-gold', '/admin/categories'],
    [Boxes, 'Units on hand', number(k.unitsOnHand), 'text-gold'],
    [Wallet, 'Stock value (cost)', money(k.inventoryCostValue), 'text-gold'],
    [Wallet, 'Stock value (retail)', money(k.inventoryRetailValue), 'text-gold'],
  ];
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Live figures from your catalog and stock records" actions={<Link to="/admin/products/new" className="btn-primary">Add product</Link>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(([icon, label, value, tone, to], i) => <Kpi key={label} icon={icon} label={label} value={value} tone={tone} to={to} i={i} />)}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="card p-5 lg:col-span-3">
          <h2 className="mb-4 text-lg">Live products by category</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.categoryBreakdown} margin={{ left: -20 }}>
                <CartesianGrid vertical={false} stroke="#EAE0D6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#897D73' }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#897D73' }} />
                <Tooltip cursor={{ fill: '#F5EEE6' }} contentStyle={{ borderRadius: 12, border: '1px solid #EAE0D6' }} />
                <Bar dataKey="products" fill="#C99A63" radius={[6, 6, 0, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="lg:col-span-2">
          <MiniList
            title="Most viewed"
            items={data.topViewed}
            empty="No views yet"
            render={(p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <img src={p.images[0]?.url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                <Link to={`/admin/products/${p.id}`} className="flex-1 truncate text-sm hover:text-gold-dark">{p.name}</Link>
                <span className="flex items-center gap-1 text-xs text-taupe"><Eye className="h-3.5 w-3.5" />{p.viewCount}</span>
              </li>
            )}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <MiniList
          title="Low stock"
          items={data.lowStock}
          empty="Nothing is running low"
          link={<Link to="/admin/products?stock=low" className="text-xs text-taupe hover:text-gold-dark">View all</Link>}
          render={(p) => (
            <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
              <Link to={`/admin/products/${p.id}`} className="truncate hover:text-gold-dark">{p.name} <span className="text-xs text-taupe">· {p.sku}</span></Link>
              <span className="chip bg-amber-50 text-amber-700">{p.stock} left</span>
            </li>
          )}
        />
        <MiniList
          title="Recent stock changes"
          items={data.recentMovements}
          empty="No stock changes yet"
          link={<Link to="/admin/inventory" className="text-xs text-taupe hover:text-gold-dark">View all</Link>}
          render={(m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate">{m.product.name}</p>
                <p className="text-xs text-taupe">{MOVE_LABEL[m.type]} · {m.actor?.name || 'System'} · {dateTime(m.createdAt)}</p>
              </div>
              <span className={`font-medium ${m.quantity > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span>
            </li>
          )}
        />
      </div>
    </>
  );
}
