import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Heart, Menu, X, ChevronDown, Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react';
import { useSite } from '../lib/content.jsx';
import { useWishlist } from '../lib/wishlist.js';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop All' },
  { to: '/new-arrivals', label: 'New Arrivals' },
  { to: '/best-sellers', label: 'Best Sellers' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

function SearchOverlay({ open, onClose }) {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 bg-espresso/20 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.form
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/shop?search=${encodeURIComponent(q.trim())}`);
              onClose();
            }}
            className="container-x mt-20"
          >
            <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-full border border-line bg-warm px-5 py-3 shadow-lift">
              <Search className="h-5 w-5 text-taupe" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bags, pearls, watches…" className="flex-1 bg-transparent text-base outline-none" aria-label="Search products" />
              <button type="button" onClick={onClose} aria-label="Close search">
                <X className="h-5 w-5 text-taupe" />
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Header() {
  const { content, categories } = useSite();
  const { items } = useWishlist();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const { pathname } = useLocation();
  const store = content.store || {};

  useEffect(() => {
    setMenuOpen(false);
    setCatOpen(false);
  }, [pathname]);

  const linkCls = ({ isActive }) => `text-sm transition-colors hover:text-gold-dark ${isActive ? 'text-gold-dark' : 'text-espresso'}`;

  return (
    <>
      {store.announcement && <div className="bg-cream py-2 text-center text-xs tracking-wide text-espresso">{store.announcement}</div>}
      <header className="sticky top-0 z-40 border-b border-line bg-warm/90 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between gap-4">
          <button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="font-serif text-2xl tracking-wide">
            {store.name || 'Adcessories'}
          </Link>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
            {NAV.slice(0, 2).map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>
                {n.label}
              </NavLink>
            ))}
            <div className="relative" onMouseEnter={() => setCatOpen(true)} onMouseLeave={() => setCatOpen(false)}>
              <button className="flex items-center gap-1 text-sm hover:text-gold-dark" aria-expanded={catOpen} onClick={() => setCatOpen((o) => !o)}>
                Categories <ChevronDown className={`h-3.5 w-3.5 transition-transform ${catOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {catOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.18 }}
                    className="absolute left-1/2 top-full w-60 -translate-x-1/2 pt-3"
                  >
                    <div className="card p-2">
                      {categories.map((c) => (
                        <Link key={c.id} to={`/category/${c.slug}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-cream">
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {NAV.slice(2).map((n) => (
              <NavLink key={n.to} to={n.to} className={linkCls}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-cream" onClick={() => setSearchOpen(true)} aria-label="Search">
              <Search className="h-[18px] w-[18px]" />
            </button>
            <Link to="/wishlist" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-cream" aria-label="Wishlist">
              <Heart className="h-[18px] w-[18px]" />
              {items.length > 0 && (
                <motion.span key={items.length} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] text-white">
                  {items.length}
                </motion.span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div className="fixed inset-0 z-50 bg-espresso/30 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)}>
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="h-full w-80 max-w-[85%] overflow-y-auto bg-warm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-serif text-xl">{store.name || 'Adcessories'}</span>
                <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {NAV.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.end} className="rounded-lg px-3 py-2.5 hover:bg-cream">
                    {n.label}
                  </NavLink>
                ))}
                <p className="eyebrow mt-5 px-3">Categories</p>
                {categories.map((c) => (
                  <Link key={c.id} to={`/category/${c.slug}`} className="rounded-lg px-3 py-2 text-sm text-taupe hover:bg-cream">
                    {c.name}
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

function Footer() {
  const { content, categories } = useSite();
  const store = content.store || {};
  const contact = content.contact || {};
  const social = content.social || {};
  return (
    <footer className="mt-24 border-t border-line bg-cream/60">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-serif text-2xl">{store.name || 'Adcessories'}</p>
          <p className="mt-3 text-sm text-taupe">{store.tagline}</p>
          <div className="mt-5 flex gap-2">
            {social.instagram && (
              <a href={social.instagram} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-warm hover:text-gold" aria-label="Instagram">
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {social.facebook && (
              <a href={social.facebook} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-full bg-warm hover:text-gold" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <div>
          <p className="eyebrow">Shop</p>
          <ul className="mt-4 space-y-2 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link to={`/category/${c.slug}`} className="text-taupe hover:text-espresso">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow">Help</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link to="/about" className="text-taupe hover:text-espresso">About us</Link></li>
            <li><Link to="/contact" className="text-taupe hover:text-espresso">Contact & FAQ</Link></li>
            <li><Link to="/policies" className="text-taupe hover:text-espresso">Shipping & returns</Link></li>
            <li><Link to="/policies#privacy" className="text-taupe hover:text-espresso">Privacy & terms</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">Get in touch</p>
          <ul className="mt-4 space-y-2.5 text-sm text-taupe">
            {contact.email && <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><a href={`mailto:${contact.email}`}>{contact.email}</a></li>}
            {contact.phone && <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0" /><a href={`tel:${contact.phone.replace(/\s/g, '')}`}>{contact.phone}</a></li>}
            {contact.address && <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{contact.address}</li>}
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-taupe">
        © {new Date().getFullYear()} {store.name || 'Adcessories'}. All rights reserved.
      </div>
    </footer>
  );
}

export default function StoreLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
