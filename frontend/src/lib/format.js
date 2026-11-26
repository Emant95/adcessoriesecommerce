const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const money = (n, currency = 'NPR') => (n == null ? '' : `${currency === 'NPR' ? 'Rs.' : currency} ${nf.format(n)}`);
export const number = (n) => nf.format(n || 0);
export const dateTime = (d) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const availabilityLabel = {
  IN_STOCK: { text: 'In stock', cls: 'bg-emerald-50 text-emerald-700' },
  LOW_STOCK: { text: 'Only a few left', cls: 'bg-amber-50 text-amber-700' },
  OUT_OF_STOCK: { text: 'Out of stock', cls: 'bg-stone-100 text-stone-500' },
};
