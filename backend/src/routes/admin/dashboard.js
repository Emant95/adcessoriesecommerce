const express = require('express');
const prisma = require('../../lib/prisma');
const { asyncHandler } = require('../../lib/errors');
const { adminProduct } = require('../../lib/serialize');

const router = express.Router();

// All figures are computed from the live database.
router.get('/', asyncHandler(async (req, res) => {
  const [statusCounts, categoryCount, lowStockRaw, outOfStock, valuation, recentMovements, recentProducts, topViewed] =
    await Promise.all([
      prisma.product.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.category.count({ where: { isActive: true } }),
      prisma.$queryRaw`SELECT id FROM "Product" WHERE status <> 'ARCHIVED' AND stock > 0 AND stock <= "lowStockThreshold" ORDER BY stock ASC LIMIT 20`,
      prisma.product.count({ where: { status: { not: 'ARCHIVED' }, stock: { lte: 0 } } }),
      prisma.$queryRaw`SELECT COALESCE(SUM(stock * COALESCE("costPrice", 0)), 0)::float AS cost, COALESCE(SUM(stock * price), 0)::float AS retail, COALESCE(SUM(stock), 0)::int AS units FROM "Product" WHERE status <> 'ARCHIVED'`,
      prisma.stockMovement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { product: { select: { name: true, sku: true } }, actor: { select: { name: true } } },
      }),
      prisma.product.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { images: true, category: true } }),
      prisma.product.findMany({ where: { status: 'PUBLISHED' }, orderBy: { viewCount: 'desc' }, take: 5, include: { images: true, category: true } }),
    ]);

  const byStatus = Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all]));
  const lowStockIds = lowStockRaw.map((r) => r.id);
  const lowStock = lowStockIds.length
    ? await prisma.product.findMany({ where: { id: { in: lowStockIds } }, include: { images: true, category: true }, orderBy: { stock: 'asc' } })
    : [];

  const categoryBreakdown = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { name: true, _count: { select: { products: { where: { status: 'PUBLISHED' } } } } },
  });

  res.json({
    kpis: {
      totalProducts: (byStatus.PUBLISHED || 0) + (byStatus.DRAFT || 0),
      published: byStatus.PUBLISHED || 0,
      drafts: byStatus.DRAFT || 0,
      archived: byStatus.ARCHIVED || 0,
      categories: categoryCount,
      lowStock: lowStockIds.length,
      outOfStock,
      unitsOnHand: valuation[0].units,
      inventoryCostValue: valuation[0].cost,
      inventoryRetailValue: valuation[0].retail,
    },
    lowStock: lowStock.map(adminProduct),
    recentProducts: recentProducts.map(adminProduct),
    topViewed: topViewed.map(adminProduct),
    recentMovements,
    categoryBreakdown: categoryBreakdown.map((c) => ({ name: c.name, products: c._count.products })),
  });
}));

module.exports = router;
