import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import StoreLayout from './components/StoreLayout.jsx';
import { ContentProvider } from './lib/content.jsx';
import Home from './pages/store/Home.jsx';
import Shop from './pages/store/Shop.jsx';
import Product from './pages/store/Product.jsx';
import About from './pages/store/About.jsx';
import Contact from './pages/store/Contact.jsx';
import Policies from './pages/store/Policies.jsx';
import Wishlist from './pages/store/Wishlist.jsx';
import NotFound from './pages/store/NotFound.jsx';
import { PageSpinner } from './components/Skeleton.jsx';

// Admin is code-split so shoppers never download it.
const AdminApp = lazy(() => import('./pages/admin/AdminApp.jsx'));

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<PageSpinner />}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route
        element={
          <ContentProvider>
            <StoreLayout />
          </ContentProvider>
        }
      >
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="category/:slug" element={<Shop />} />
        <Route path="new-arrivals" element={<Shop preset="newArrival" />} />
        <Route path="best-sellers" element={<Shop preset="bestSeller" />} />
        <Route path="product/:slug" element={<Product />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="policies" element={<Policies />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
