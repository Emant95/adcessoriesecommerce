const prisma = require('./prisma');

async function audit(req, action, entity, entityId, details, tx = prisma) {
  await tx.auditLog.create({
    data: {
      actorId: req.admin ? req.admin.id : null,
      action,
      entity,
      entityId: entityId == null ? null : String(entityId),
      details: details || undefined,
    },
  });
}

module.exports = { audit };
