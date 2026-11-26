const jwt = require('jsonwebtoken');
const config = require('../lib/config');
const prisma = require('../lib/prisma');
const { can } = require('../lib/permissions');
const { unauthorized, forbidden, asyncHandler } = require('../lib/errors');

const COOKIE_NAME = 'admin_token';

const cookieOptions = () => ({
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: 'strict', // blocks cross-site requests from carrying the session (CSRF mitigation)
  path: '/api',
  maxAge: 12 * 60 * 60 * 1000,
});

const signToken = (admin) => jwt.sign({ sub: admin.id, role: admin.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

// Loads the admin from the cookie (or Bearer token) and checks they are still active.
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.get('authorization');
  const token = req.cookies[COOKIE_NAME] || (header && header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) throw unauthorized();
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized('Session expired, please sign in again');
  }
  const admin = await prisma.adminUser.findUnique({ where: { id: Number(payload.sub) } });
  if (!admin || !admin.isActive) throw unauthorized('Account is not active');
  req.admin = admin;
  next();
});

const requirePermission = (permission) => (req, res, next) => {
  if (!req.admin) return next(unauthorized());
  if (!can(req.admin.role, permission)) return next(forbidden());
  next();
};

module.exports = { COOKIE_NAME, cookieOptions, signToken, requireAuth, requirePermission };
