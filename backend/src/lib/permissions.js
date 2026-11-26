// Role -> permission map. Every protected admin route checks one of these on the server.
const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',
  PRODUCTS_WRITE: 'products:write',
  INVENTORY_WRITE: 'inventory:write',
  CATEGORIES_WRITE: 'categories:write',
  CONTENT_WRITE: 'content:write',
  USERS_MANAGE: 'users:manage',
  AUDIT_VIEW: 'audit:view',
};

const P = PERMISSIONS;

const ROLE_PERMISSIONS = {
  SUPER_ADMIN: Object.values(P),
  STORE_MANAGER: [P.DASHBOARD_VIEW, P.PRODUCTS_WRITE, P.INVENTORY_WRITE, P.CATEGORIES_WRITE, P.AUDIT_VIEW],
  INVENTORY_MANAGER: [P.DASHBOARD_VIEW, P.INVENTORY_WRITE],
  CONTENT_MANAGER: [P.DASHBOARD_VIEW, P.CATEGORIES_WRITE, P.CONTENT_WRITE],
};

const permissionsFor = (role) => ROLE_PERMISSIONS[role] || [];
const can = (role, permission) => permissionsFor(role).includes(permission);

module.exports = { PERMISSIONS, ROLE_PERMISSIONS, permissionsFor, can };
