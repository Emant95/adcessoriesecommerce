const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, unauthorized, badRequest } = require('../../lib/errors');
const { validate } = require('../../middleware/validate');
const { COOKIE_NAME, cookieOptions, signToken, requireAuth } = require('../../middleware/auth');
const { permissionsFor } = require('../../lib/permissions');
const { publicAdmin } = require('../../lib/serialize');
const { audit } = require('../../lib/audit');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT || 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many sign-in attempts. Please try again in 15 minutes.' } },
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  const ok = admin && admin.isActive && (await bcrypt.compare(password, admin.passwordHash));
  if (!ok) throw unauthorized('Invalid email or password');
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  req.admin = admin;
  await audit(req, 'login', 'AdminUser', admin.id);
  const token = signToken(admin);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ admin: publicAdmin(admin), permissions: permissionsFor(admin.role) });
}));

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ admin: publicAdmin(req.admin), permissions: permissionsFor(req.admin.role) });
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(200),
});

router.post('/change-password', requireAuth, validate(passwordSchema), asyncHandler(async (req, res) => {
  const ok = await bcrypt.compare(req.body.currentPassword, req.admin.passwordHash);
  if (!ok) throw badRequest('Current password is incorrect');
  const passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  await prisma.adminUser.update({ where: { id: req.admin.id }, data: { passwordHash } });
  await audit(req, 'change_password', 'AdminUser', req.admin.id);
  res.json({ ok: true });
}));

module.exports = router;
