import { useEffect, useState } from 'react';

// Wishlist is kept in the browser only; no account or checkout is involved.
const KEY = 'adc_wishlist';
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

export function useWishlist() {
  const [items, setItems] = useState(read);
  useEffect(() => {
    const sync = () => setItems(read());
    window.addEventListener('wishlist-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('wishlist-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const toggle = (product) => {
    const cur = read();
    const exists = cur.some((p) => p.slug === product.slug);
    const next = exists
      ? cur.filter((p) => p.slug !== product.slug)
      : [...cur, { slug: product.slug, name: product.name, price: product.price, image: product.images?.[0]?.url }];
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('wishlist-change'));
    return !exists;
  };
  return { items, has: (slug) => items.some((p) => p.slug === slug), toggle };
}
