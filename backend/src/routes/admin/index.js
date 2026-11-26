const express = require('express');
const { requireAuth, requirePermission } = require('../../middleware/auth');
const { PERMISSIONS: P } = require('../../lib/permissions');

const router = express.Router();

router.use('/auth', require('./auth'));

router.use(requireAuth);
router.use('/dashboard', requirePermission(P.DASHBOARD_VIEW), require('./dashboard'));
router.use('/products', require('./products')); // read for any admin; writes check permissions per route
router.use('/categories', require('./categories'));
router.use('/inventory', requirePermission(P.INVENTORY_WRITE), require('./inventory'));
router.use('/content', requirePermission(P.CONTENT_WRITE), require('./content').router);
router.use('/users', requirePermission(P.USERS_MANAGE), require('./users'));
router.use('/audit', requirePermission(P.AUDIT_VIEW), require('./audit'));

module.exports = router;
