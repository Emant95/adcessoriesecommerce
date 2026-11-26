const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const config = require('../lib/config');
const { asyncHandler, notFound } = require('../lib/errors');
const { validate } = require('../middleware/validate');
const { publicProduct } = require('../lib/serialize');

const router = express.Router();

const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []));
const bool = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  colors: csv,
  sizes: csv,
  tags: csv,
  inStock: bool,
  onSale: bool,
  featured: bool,
  newArrival: bool,
  bestSeller: bool,
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular', 'best_selling', 'name']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
});

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' } },
  category: { select: { id: true, name: true, slug: true } },
};

async function categoryIdsFor(slug) {
  const cat = await prisma.category.findFirst({
    where: { slug, isActive: true },
    include: { children: { where: { isActive: true }, select: { id: true } } },
  });
  if (!cat) return null;
  return [cat.id, ...cat.children.map((c) => c.id)];
}

router.get('/health', asyncHandler(async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok' });
}));

router.get('/products', validate(listQuery, 'query'), asyncHandler(async (req, res) => {
  const q = req.validQuery;
  const where = { status: 'PUBLISHED', category: { isActive: true } };
  const and = [];

  if (q.search) {
    and.push({
      OR: [
        { name: { contains: q.search, mode: 'insensitive' } },
        { description: { contains: q.search, mode: 'insensitive' } },
        { sku: { contains: q.search, mode: 'insensitive' } },
        { tags: { has: q.search.toLowerCase() } },
      ],
    });
  }
  if (q.category) {
    const ids = await categoryIdsFor(q.category);
    if (!ids) return res.json({ items: [], page: 1, limit: q.limit, total: 0, totalPages: 0 });
    and.push({ categoryId: { in: ids } });
  }
  if (q.minPrice != null || q.maxPrice != null) {
    and.push({ price: { ...(q.minPrice != null && { gte: q.minPrice }), ...(q.maxPrice != null && { lte: q.maxPrice }) } });
  }
  if (q.colors.length) and.push({ colors: { hasSome: q.colors } });
  if (q.sizes.length) and.push({ sizes: { hasSome: q.sizes } });
  if (q.tags.length) and.push({ tags: { hasSome: q.tags.map((t) => t.toLowerCase()) } });
  if (q.inStock) and.push({ stock: { gt: 0 } });
  if (q.onSale) and.push({ compareAtPrice: { not: null } });
  if (q.featured) and.push({ isFeatured: true });
  if (q.newArrival) and.push({ isNewArrival: true });
  if (q.bestSeller) and.push({ isBestSeller: true });
  if (and.length) where.AND = and;

  const orderBy = {
    newest: [{ createdAt: 'desc' }],
    price_asc: [{ price: 'asc' }],
    price_desc: [{ price: 'desc' }],
    popular: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
    best_selling: [{ isBestSeller: 'desc' }, { viewCount: 'desc' }],
    name: [{ name: 'asc' }],
  }[q.sort];

  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, orderBy, include: productInclude, skip: (q.page - 1) * q.limit, take: q.limit }),
  ]);

  let items = rows.map(publicProduct);
  // "On sale" means the compare-at price is actually higher than the price.
  if (q.onSale) items = items.filter((p) => p.discountPercent > 0);

  res.json({ items, page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) });
}));

// Distinct filter values for the shop sidebar.
router.get('/filters', asyncHandler(async (req, res) => {
  const rows = await prisma.product.findMany({
    where: { status: 'PUBLISHED', category: { isActive: true } },
    select: { colors: true, sizes: true, tags: true, price: true },
  });
  const uniq = (arr) => [...new Set(arr)].sort((a, b) => a.localeCompare(b));
  const prices = rows.map((r) => Number(r.price));
  res.json({
    colors: uniq(rows.flatMap((r) => r.colors)),
    sizes: uniq(rows.flatMap((r) => r.sizes)),
    tags: uniq(rows.flatMap((r) => r.tags)),
    priceRange: { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 },
  });
}));

router.get('/products/:slug', asyncHandler(async (req, res) => {
  const product = await prisma.product.findFirst({
    where: { slug: req.params.slug, status: 'PUBLISHED', category: { isActive: true } },
    include: productInclude,
  });
  if (!product) throw notFound('Product not found');

  const [related] = await Promise.all([
    prisma.product.findMany({
      where: { status: 'PUBLISHED', categoryId: product.categoryId, id: { not: product.id } },
      include: productInclude,
      orderBy: { viewCount: 'desc' },
      take: 4,
    }),
    prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } }),
  ]);

  res.json({ product: publicProduct(product), related: related.map(publicProduct) });
}));

router.get('/categories', asyncHandler(async (req, res) => {
  const cats = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: { where: { status: 'PUBLISHED' } } } } },
  });
  const shape = (c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    parentId: c.parentId,
    productCount: c._count.products,
  });
  const top = cats.filter((c) => !c.parentId || !cats.some((p) => p.id === c.parentId));
  res.json({
    items: top.map((c) => ({ ...shape(c), children: cats.filter((x) => x.parentId === c.id).map(shape) })),
  });
}));

router.get('/categories/:slug', asyncHandler(async (req, res) => {
  const c = await prisma.category.findFirst({
    where: { slug: req.params.slug, isActive: true },
    include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } }, parent: true },
  });
  if (!c) throw notFound('Category not found');
  res.json({
    category: {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      parent: c.parent && c.parent.isActive ? { name: c.parent.name, slug: c.parent.slug } : null,
      children: c.children.map((x) => ({ id: x.id, name: x.name, slug: x.slug })),
    },
  });
}));

router.get('/content', asyncHandler(async (req, res) => {
  const rows = await prisma.siteContent.findMany();
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
}));

router.get('/sitemap.xml', asyncHandler(async (req, res) => {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const base = config.publicSiteUrl;
  const urls = [
    ...['/', '/shop', '/about', '/contact', '/policies'].map((p) => ({ loc: base + p })),
    ...categories.map((c) => ({ loc: `${base}/category/${c.slug}`, lastmod: c.updatedAt })),
    ...products.map((p) => ({ loc: `${base}/product/${p.slug}`, lastmod: p.updatedAt })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString()}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>\n`;
  res.type('application/xml').send(xml);
}));

module.exports = router;
