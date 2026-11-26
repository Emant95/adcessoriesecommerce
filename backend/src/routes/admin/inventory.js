const express = require('express');
const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler } = require('../../lib/errors');
const { validate } = require('../../middleware/validate');

const router = express.Router();

const q = z.object({
  search: z.string().trim().max(100).optional(),
  type: z.enum(['STOCK_IN', 'STOCK_OUT', 'RETURN', 'DAMAGED', 'ADJUSTMENT']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

router.get('/movements', validate(q, 'query'), asyncHandler(async (req, res) => {
  const { search, type, from, to, page, limit } = req.validQuery;
  const where = {};
  if (type) where.type = type;
  if (from || to) where.createdAt = { ...(from && { gte: from }), ...(to && { lte: to }) };
  if (search) {
    where.product = {
      OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }],
    };
  }
  const [total, items] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { product: { select: { id: true, name: true, sku: true } }, actor: { select: { name: true } } },
    }),
  ]);
  res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
}));

module.exports = router;
