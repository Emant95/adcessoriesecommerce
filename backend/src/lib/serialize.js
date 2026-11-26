const num = (d) => (d == null ? null : Number(d));

function availability(p) {
  if (p.stock <= 0) return 'OUT_OF_STOCK';
  if (p.stock <= p.lowStockThreshold) return 'LOW_STOCK';
  return 'IN_STOCK';
}

function discountPercent(price, compareAt) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

// Public shape: never exposes cost price or exact internal fields.
function publicProduct(p) {
  const price = num(p.price);
  const compareAtPrice = num(p.compareAtPrice);
  const images = (p.images || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    description: p.description,
    specifications: p.specifications,
    price,
    compareAtPrice,
    discountPercent: discountPercent(price, compareAtPrice),
    availability: availability(p),
    inStock: p.stock > 0,
    colors: p.colors,
    sizes: p.sizes,
    tags: p.tags,
    isFeatured: p.isFeatured,
    isNewArrival: p.isNewArrival,
    isBestSeller: p.isBestSeller,
    category: p.category ? { id: p.category.id, name: p.category.name, slug: p.category.slug } : undefined,
    images: images.map((i) => ({ id: i.id, url: i.url, alt: i.alt || p.name })),
    createdAt: p.createdAt,
  };
}

function adminProduct(p) {
  return {
    ...publicProduct(p),
    status: p.status,
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    costPrice: num(p.costPrice),
    weightGrams: p.weightGrams,
    categoryId: p.categoryId,
    viewCount: p.viewCount,
    updatedAt: p.updatedAt,
  };
}

function publicAdmin(u) {
  const { passwordHash, ...rest } = u;
  return rest;
}

module.exports = { publicProduct, adminProduct, publicAdmin, availability, num };
