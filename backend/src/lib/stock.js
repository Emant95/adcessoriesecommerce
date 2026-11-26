const prisma = require('./prisma');
const { badRequest, notFound } = require('./errors');

const SIGN = { STOCK_IN: 1, RETURN: 1, STOCK_OUT: -1, DAMAGED: -1 };

/**
 * Apply a stock movement inside a transaction with a row lock so concurrent
 * adjustments cannot race. Stock is never overwritten without a movement record,
 * and can never go negative.
 *
 * For ADJUSTMENT, `quantity` is the signed delta (e.g. -3 or +2).
 * For all other types, `quantity` is a positive amount and the sign comes from the type.
 */
async function applyStockMovement({ productId, type, quantity, reason, reference, actorId }, client = prisma) {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty === 0) throw badRequest('Quantity must be a non-zero whole number');
  if (type !== 'ADJUSTMENT' && qty < 0) throw badRequest('Quantity must be positive for this movement type');
  if ((type === 'ADJUSTMENT' || type === 'DAMAGED') && !reason) {
    throw badRequest('A reason is required for adjustments and damaged stock');
  }
  const delta = type === 'ADJUSTMENT' ? qty : qty * SIGN[type];

  const run = async (tx) => {
    const rows = await tx.$queryRaw`SELECT id, stock FROM "Product" WHERE id = ${productId} FOR UPDATE`;
    if (!rows.length) throw notFound('Product not found');
    const before = rows[0].stock;
    const after = before + delta;
    if (after < 0) throw badRequest(`Not enough stock: ${before} on hand, change of ${delta} would go negative`);
    await tx.product.update({ where: { id: productId }, data: { stock: after } });
    return tx.stockMovement.create({
      data: { productId, type, quantity: delta, before, after, reason: reason || null, reference: reference || null, actorId },
    });
  };

  // Allow callers to pass an existing transaction client.
  return client === prisma ? prisma.$transaction(run) : run(client);
}

module.exports = { applyStockMovement };
