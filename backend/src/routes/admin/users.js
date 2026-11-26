const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, notFound, badRequest } = require('../../lib/errors');
const { validate } = require('../../middleware/validate');
const { publicAdmin } = require('../../lib/serialize');
const { audit } = require('../../lib/audit');

const router = express.Router();
const roles = z.enum(['SUPER_ADMIN', 'STORE_MANAGER', 'INVENTORY_MANAGER', 'CONTENT_MANAGER']);

router.get('/', asyncHandler(async (req, res) => {
  const items = await prisma.adminUser.findMany({ orderBy: { createdAt: 'asc' } });
  res.json({ items: items.map(publicAdmin) });
}));

const createBody = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  role: roles,
});

router.post('/', validate(createBody), asyncHandler(async (req, res) => {
  const { password, ...data } = req.body;
  const user = await prisma.adminUser.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 12) } });
  await audit(req, 'create', 'AdminUser', user.id, { email: user.email, role: user.role });
  res.status(201).json({ user: publicAdmin(user) });
}));

const updateBody = z.object({
  name: z.string().trim().min(2).max(100),
  role: roles,
  isActive: z.boolean(),
  password: z.string().min(8).max(200).optional().or(z.literal('')),
});

router.put('/:id', validate(updateBody), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await prisma.adminUser.findUnique({ where: { id } });
  if (!existing) throw notFound('User not found');
  if (id === req.admin.id && (!req.body.isActive || req.body.role !== 'SUPER_ADMIN')) {
    throw badRequest('You cannot deactivate yourself or remove your own Super Admin role');
  }
  const { password, ...data } = req.body;
  if (password) data.passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.adminUser.update({ where: { id }, data });
  await audit(req, 'update', 'AdminUser', id, { role: user.role, isActive: user.isActive, passwordChanged: Boolean(password) });
  res.json({ user: publicAdmin(user) });
}));

module.exports = router;
