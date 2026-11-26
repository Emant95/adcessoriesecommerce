const express = require('express');
const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, notFound, badRequest } = require('../../lib/errors');
const { validate } = require('../../middleware/validate');
const { requirePermission } = require('../../middleware/auth');
const { PERMISSIONS } = require('../../lib/permissions');
const { adminProduct } = require('../../lib/serialize');
const { uniqueSlug } = require('../../lib/slug');
const { audit } = require('../../lib/audit');
const { upload, verifyUploaded, removeUpload } = require('../../lib/upload');
const { applyStockMovement } = require('../../lib/stock');

const router = express.Router();
const include = { images: { orderBy: { sortOrder: 'asc' } }, category: { select: { id: true, name: true, slug: true } } };

const list = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((v) => {
    const arr = Array.isArray(v) ? v : v ? v.split(',') : [];
    return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
  });
const money = z.coerce.number().min(0).max(10_000_000);
const optionalMoney = z.union([money, z.literal('').transform(() => null), z.null()]).optional();

const productBody = z
  .object({
    name: z.string().trim().min(2).max(200),
    sku: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/, 'SKU can contain letters, numbers, dot, dash and underscore'),
    slug: z.string().trim().max(200).optional(),
    description: z.string().max(10_000).default(''),
    specifications: z.string().max(10_000).default(''),
    price: money,
    compareAtPrice: optionalMoney,
    costPrice: optionalMoney,
    lowStockThreshold: z.coerce.number().int().min(0).max(100_000).default(5),
    weightGrams: z.union([z.coerce.number().int().min(0), z.literal('').transform(() => null), z.null()]).optional(),
    colors: list,
    sizes: list,
    tags: list.transform((t) => t.map((x) => x.toLowerCase())),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
    isFeatured: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    categoryId: z.coerce.number().int().positive(),
  })
  .refine((d) => d.compareAtPrice == null || d.compareAtPrice >= d.price, {
    message: 'Original price must be greater than or equal to the selling price',
    path: ['compareAtPrice'],
  });

const createBody = productBody.and(z.object({ initialStock: z.coerce.number().int().min(0).max(1_000_000).default(0) }));

async function assertCategory(categoryId) {
  const cat = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!cat) throw badRequest('Category does not exist', [{ field: 'categoryId', message: 'Choose a valid category' }]);
}

const listQuery = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  categoryId: z.coerce.number().int().optional(),
  stock: z.enum(['low', 'out', 'in']).optional(),
  sort: z.enum(['newest', 'name', 'price', 'stock']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get('/', validate(listQuery, 'query'), asyncHandler(async (req, res) => {
  const q = req.validQuery;
  const where = {};
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: 'insensitive' } },
      { sku: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  if (q.status) where.status = q.status;
  else where.status = { not: 'ARCHIVED' };
  if (q.categoryId) where.categoryId = q.categoryId;
  if (q.stock === 'out') where.stock = { lte: 0 };
  if (q.stock === 'in') where.stock = { gt: 0 };
  if (q.stock === 'low') {
    const ids = await prisma.$queryRaw`SELECT id FROM "Product" WHERE stock > 0 AND stock <= "lowStockThreshold"`;
    where.id = { in: ids.map((r) => r.id) };
  }
  const orderBy = { newest: { createdAt: 'desc' }, name: { name: 'asc' }, price: { price: 'asc' }, stock: { stock: 'asc' } }[q.sort];
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({ where, include, orderBy, skip: (q.page - 1) * q.limit, take: q.limit }),
  ]);
  res.json({ items: rows.map(adminProduct), total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) });
}));

const csvCell = (v) => {
  let s = v == null ? '' : Array.isArray(v) ? v.join('|') : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // prevent spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get('/export.csv', asyncHandler(async (req, res) => {
  const rows = await prisma.product.findMany({ include, orderBy: { id: 'asc' } });
  const cols = ['id', 'sku', 'name', 'category', 'status', 'price', 'compareAtPrice', 'costPrice', 'stock', 'lowStockThreshold', 'colors', 'sizes', 'tags', 'isFeatured', 'isNewArrival', 'isBestSeller'];
  const lines = [cols.join(',')];
  for (const r of rows) {
    const p = adminProduct(r);
    lines.push(cols.map((c) => csvCell(c === 'category' ? p.category && p.category.name : p[c])).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`﻿${lines.join('\n')}\n`);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const p = await prisma.product.findUnique({ where: { id: Number(req.params.id) }, include });
  if (!p) throw notFound('Product not found');
  res.json({ product: adminProduct(p) });
}));

router.post('/', requirePermission(PERMISSIONS.PRODUCTS_WRITE), validate(createBody), asyncHandler(async (req, res) => {
  const { initialStock, slug, ...data } = req.body;
  await assertCategory(data.categoryId);
  data.slug = await uniqueSlug(prisma.product, slug || data.name);
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({ data: { ...data, stock: 0 } });
    if (initialStock > 0) {
      await applyStockMovement(
        { productId: created.id, type: 'STOCK_IN', quantity: initialStock, reason: 'Initial stock', reference: 'product-create', actorId: req.admin.id },
        tx,
      );
    }
    await audit(req, 'create', 'Product', created.id, { sku: created.sku, name: created.name }, tx);
    return tx.product.findUnique({ where: { id: created.id }, include });
  });
  res.status(201).json({ product: adminProduct(product) });
}));

router.put('/:id', requirePermission(PERMISSIONS.PRODUCTS_WRITE), validate(productBody), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw notFound('Product not found');
  const { slug, ...data } = req.body;
  await assertCategory(data.categoryId);
  data.slug = slug && slug !== existing.slug ? await uniqueSlug(prisma.product, slug, id) : existing.slug;
  const product = await prisma.product.update({ where: { id }, data, include });
  await audit(req, 'update', 'Product', id, { sku: product.sku });
  res.json({ product: adminProduct(product) });
}));

const bulkBody = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(500),
  action: z.enum(['publish', 'unpublish', 'archive', 'feature', 'unfeature']),
});

router.post('/bulk', requirePermission(PERMISSIONS.PRODUCTS_WRITE), validate(bulkBody), asyncHandler(async (req, res) => {
  const data = {
    publish: { status: 'PUBLISHED' },
    unpublish: { status: 'DRAFT' },
    archive: { status: 'ARCHIVED' },
    feature: { isFeatured: true },
    unfeature: { isFeatured: false },
  }[req.body.action];
  const result = await prisma.product.updateMany({ where: { id: { in: req.body.ids } }, data });
  await audit(req, `bulk_${req.body.action}`, 'Product', null, { ids: req.body.ids });
  res.json({ updated: result.count });
}));

router.delete('/:id', requirePermission(PERMISSIONS.PRODUCTS_WRITE), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const product = await prisma.product.findUnique({ where: { id }, include: { images: true } });
  if (!product) throw notFound('Product not found');
  await prisma.product.delete({ where: { id } });
  product.images.forEach((img) => removeUpload(img.url));
  await audit(req, 'delete', 'Product', id, { sku: product.sku, name: product.name });
  res.status(204).end();
}));

// ---- Images ----
router.post('/:id/images', requirePermission(PERMISSIONS.PRODUCTS_WRITE), upload.array('images', 10), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const urls = verifyUploaded(req.files);
  if (!urls.length) throw badRequest('Choose at least one image');
  const product = await prisma.product.findUnique({ where: { id }, include: { images: true } });
  if (!product) {
    urls.forEach(removeUpload);
    throw notFound('Product not found');
  }
  const start = product.images.reduce((m, i) => Math.max(m, i.sortOrder + 1), 0);
  await prisma.productImage.createMany({ data: urls.map((url, i) => ({ productId: id, url, alt: product.name, sortOrder: start + i })) });
  await audit(req, 'add_images', 'Product', id, { count: urls.length });
  const updated = await prisma.product.findUnique({ where: { id }, include });
  res.status(201).json({ product: adminProduct(updated) });
}));

const orderBody = z.object({ imageIds: z.array(z.number().int().positive()).min(1) });

// First image in the list becomes the primary image.
router.put('/:id/images/order', requirePermission(PERMISSIONS.PRODUCTS_WRITE), validate(orderBody), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const images = await prisma.productImage.findMany({ where: { productId: id } });
  const valid = new Set(images.map((i) => i.id));
  if (req.body.imageIds.some((x) => !valid.has(x))) throw badRequest('Image list does not match this product');
  await prisma.$transaction(req.body.imageIds.map((imgId, idx) => prisma.productImage.update({ where: { id: imgId }, data: { sortOrder: idx } })));
  const updated = await prisma.product.findUnique({ where: { id }, include });
  res.json({ product: adminProduct(updated) });
}));

router.delete('/:id/images/:imageId', requirePermission(PERMISSIONS.PRODUCTS_WRITE), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const img = await prisma.productImage.findFirst({ where: { id: Number(req.params.imageId), productId: id } });
  if (!img) throw notFound('Image not found');
  await prisma.productImage.delete({ where: { id: img.id } });
  removeUpload(img.url);
  const updated = await prisma.product.findUnique({ where: { id }, include });
  res.json({ product: adminProduct(updated) });
}));

// ---- Stock ----
const stockBody = z.object({
  type: z.enum(['STOCK_IN', 'STOCK_OUT', 'RETURN', 'DAMAGED', 'ADJUSTMENT']),
  quantity: z.coerce.number().int(),
  reason: z.string().trim().max(500).optional(),
  reference: z.string().trim().max(100).optional(),
});

router.post('/:id/stock', requirePermission(PERMISSIONS.INVENTORY_WRITE), validate(stockBody), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const movement = await applyStockMovement({ productId: id, ...req.body, actorId: req.admin.id });
  await audit(req, 'stock_movement', 'Product', id, { type: movement.type, quantity: movement.quantity, after: movement.after });
  const product = await prisma.product.findUnique({ where: { id }, include });
  res.status(201).json({ movement, product: adminProduct(product) });
}));

router.get('/:id/movements', asyncHandler(async (req, res) => {
  const items = await prisma.stockMovement.findMany({
    where: { productId: Number(req.params.id) },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { actor: { select: { name: true } } },
  });
  res.json({ items });
}));

module.exports = router;
