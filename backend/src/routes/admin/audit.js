const express = require('express');
const prisma = require('../../lib/prisma');
const { asyncHandler } = require('../../lib/errors');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 50;
  const [total, items] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);
  res.json({ items, total, page, totalPages: Math.ceil(total / limit) });
}));

module.exports = router;
