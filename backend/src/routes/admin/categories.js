const express = require('express');
const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, notFound, badRequest, conflict } = require('../../lib/errors');
const { validate } = require('../../middleware/validate');
const { requirePermission } = require('../../middleware/auth');
const { PERMISSIONS } = require('../../lib/permissions');
const { uniqueSlug } = require('../../lib/slug');
const { audit } = require('../../lib/audit');
const { upload, verifyUploaded, removeUpload } = require('../../lib/upload');

const router = express.Router();

const body = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
  isActive: z.boolean().default(true),
  parentId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
});

router.get('/', asyncHandler(async (req, res) => {
  const items = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { products: true, children: true } }, parent: { select: { id: true, name: true } } },
  });
  res.json({ items });
}));

async function checkParent(parentId, selfId) {
  if (!parentId) return;
  if (parentId === selfId) throw badRequest('A category cannot be its own parent');
  const parent = await prisma.category.findUnique({ where: { id: parentId } });
  if (!parent) throw badRequest('Parent category does not exist');
  if (parent.parentId) throw badRequest('Subcategories can only be one level deep');
  if (selfId) {
    const kids = await prisma.category.count({ where: { parentId: selfId } });
    if (kids) throw badRequest('This category has subcategories, so it cannot become a subcategory');
  }
}

router.post('/', requirePermission(PERMISSIONS.CATEGORIES_WRITE), validate(body), asyncHandler(async (req, res) => {
  const { slug, ...data } = req.body;
  await checkParent(data.parentId);
  data.slug = await uniqueSlug(prisma.category, slug || data.name);
  const category = await prisma.category.create({ data });
  await audit(req, 'create', 'Category', category.id, { name: category.name });
  res.status(201).json({ category });
}));

router.put('/:id', requirePermission(PERMISSIONS.CATEGORIES_WRITE), validate(body), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) throw notFound('Category not found');
  const { slug, ...data } = req.body;
  await checkParent(data.parentId, id);
  data.slug = slug && slug !== existing.slug ? await uniqueSlug(prisma.category, slug, id) : existing.slug;
  const category = await prisma.category.update({ where: { id }, data });
  await audit(req, 'update', 'Category', id, { name: category.name });
  res.json({ category });
}));

router.post('/:id/image', requirePermission(PERMISSIONS.CATEGORIES_WRITE), upload.single('image'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const [url] = verifyUploaded(req.file);
  if (!url) throw badRequest('Choose an image');
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    removeUpload(url);
    throw notFound('Category not found');
  }
  const category = await prisma.category.update({ where: { id }, data: { imageUrl: url } });
  removeUpload(existing.imageUrl);
  res.json({ category });
}));

// Deletion is blocked while products or subcategories depend on the category;
// the admin must reassign them (or deactivate the category instead).
router.delete('/:id', requirePermission(PERMISSIONS.CATEGORIES_WRITE), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const c = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
  if (!c) throw notFound('Category not found');
  if (c._count.products) throw conflict(`Move this category's ${c._count.products} product(s) to another category before deleting it, or deactivate it instead`);
  if (c._count.children) throw conflict('Delete or move its subcategories first');
  await prisma.category.delete({ where: { id } });
  removeUpload(c.imageUrl);
  await audit(req, 'delete', 'Category', id, { name: c.name });
  res.status(204).end();
}));

module.exports = router;
