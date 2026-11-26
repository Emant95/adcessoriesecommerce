// Integration tests. They need an empty, migrated PostgreSQL database:
//   DATABASE_URL=postgresql://.../adcessories_test npx prisma migrate deploy
//   DATABASE_URL=postgresql://.../adcessories_test npm test
// WARNING: every table in that database is emptied before the tests run.
process.env.NODE_ENV = 'test';
process.env.LOGIN_RATE_LIMIT = '1000';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

let superCookie;
let inventoryCookie;
let categoryId;
let productId;

async function loginAs(email, password) {
  const res = await request(app).post('/api/admin/auth/login').send({ email, password });
  assert.equal(res.status, 200, res.text);
  return res.headers['set-cookie'];
}

before(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "StockMovement","ProductImage","Product","Category","AuditLog","SiteContent","AdminUser" RESTART IDENTITY CASCADE',
  );
  const hash = await bcrypt.hash('Password123!', 4);
  await prisma.adminUser.createMany({
    data: [
      { name: 'Owner', email: 'owner@test.dev', passwordHash: hash, role: 'SUPER_ADMIN' },
      { name: 'Stock', email: 'stock@test.dev', passwordHash: hash, role: 'INVENTORY_MANAGER' },
    ],
  });
  superCookie = await loginAs('owner@test.dev', 'Password123!');
  inventoryCookie = await loginAs('stock@test.dev', 'Password123!');
});

after(async () => {
  await prisma.$disconnect();
});

test('rejects wrong password', async () => {
  const res = await request(app).post('/api/admin/auth/login').send({ email: 'owner@test.dev', password: 'nope' });
  assert.equal(res.status, 401);
});

test('admin routes require sign-in', async () => {
  const res = await request(app).get('/api/admin/products');
  assert.equal(res.status, 401);
});

test('admin creates a category and a published product with opening stock', async () => {
  const cat = await request(app).post('/api/admin/categories').set('Cookie', superCookie).send({ name: 'Jewelry' });
  assert.equal(cat.status, 201, cat.text);
  categoryId = cat.body.category.id;
  assert.equal(cat.body.category.slug, 'jewelry');

  const res = await request(app)
    .post('/api/admin/products')
    .set('Cookie', superCookie)
    .send({
      name: 'Pearl Earrings',
      sku: 'PE-001',
      price: 1200,
      compareAtPrice: 1500,
      costPrice: 500,
      categoryId,
      status: 'PUBLISHED',
      colors: 'Gold, Silver',
      initialStock: 10,
      isNewArrival: true,
    });
  assert.equal(res.status, 201, res.text);
  productId = res.body.product.id;
  assert.equal(res.body.product.stock, 10);
  assert.deepEqual(res.body.product.colors, ['Gold', 'Silver']);

  const moves = await prisma.stockMovement.findMany({ where: { productId } });
  assert.equal(moves.length, 1);
  assert.equal(moves[0].before, 0);
  assert.equal(moves[0].after, 10);
});

test('duplicate SKU is rejected', async () => {
  const res = await request(app).post('/api/admin/products').set('Cookie', superCookie).send({ name: 'Copy', sku: 'PE-001', price: 10, categoryId });
  assert.equal(res.status, 409);
});

test('invalid product data returns field errors', async () => {
  const res = await request(app).post('/api/admin/products').set('Cookie', superCookie).send({ name: 'X', sku: 'bad sku!', price: -1, categoryId });
  assert.equal(res.status, 400);
  const fields = res.body.error.details.map((d) => d.field);
  assert.ok(fields.includes('price'));
  assert.ok(fields.includes('sku'));
});

test('published product appears on the storefront without cost price', async () => {
  const list = await request(app).get('/api/products?category=jewelry');
  assert.equal(list.status, 200);
  assert.equal(list.body.total, 1);
  const p = list.body.items[0];
  assert.equal(p.name, 'Pearl Earrings');
  assert.equal(p.discountPercent, 20);
  assert.equal(p.costPrice, undefined);
  assert.equal(p.stock, undefined);

  const detail = await request(app).get(`/api/products/${p.slug}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.product.availability, 'IN_STOCK');
});

test('draft products are hidden from the storefront', async () => {
  await request(app).post('/api/admin/products').set('Cookie', superCookie).send({ name: 'Secret Ring', sku: 'SR-1', price: 100, categoryId, status: 'DRAFT' });
  const res = await request(app).get('/api/products?search=secret');
  assert.equal(res.body.total, 0);
});

test('stock movements are recorded and cannot go negative', async () => {
  const out = await request(app).post(`/api/admin/products/${productId}/stock`).set('Cookie', inventoryCookie).send({ type: 'STOCK_OUT', quantity: 4 });
  assert.equal(out.status, 201, out.text);
  assert.equal(out.body.product.stock, 6);
  assert.equal(out.body.movement.before, 10);
  assert.equal(out.body.movement.after, 6);

  const tooMuch = await request(app).post(`/api/admin/products/${productId}/stock`).set('Cookie', inventoryCookie).send({ type: 'STOCK_OUT', quantity: 7 });
  assert.equal(tooMuch.status, 400);

  const noReason = await request(app).post(`/api/admin/products/${productId}/stock`).set('Cookie', inventoryCookie).send({ type: 'ADJUSTMENT', quantity: -1 });
  assert.equal(noReason.status, 400);
});

test('concurrent stock-outs never oversell', async () => {
  // 6 in stock; 10 parallel requests of 1 each: exactly 6 succeed.
  const results = await Promise.all(
    Array.from({ length: 10 }, () =>
      request(app).post(`/api/admin/products/${productId}/stock`).set('Cookie', superCookie).send({ type: 'STOCK_OUT', quantity: 1 }),
    ),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 6);
  const p = await prisma.product.findUnique({ where: { id: productId } });
  assert.equal(p.stock, 0);
  const pub = await request(app).get('/api/products?inStock=true&category=jewelry');
  assert.equal(pub.body.total, 0);
});

test('role permissions are enforced on the server', async () => {
  const edit = await request(app).put(`/api/admin/products/${productId}`).set('Cookie', inventoryCookie).send({ name: 'Hacked', sku: 'PE-001', price: 1, categoryId });
  assert.equal(edit.status, 403);
  const users = await request(app).get('/api/admin/users').set('Cookie', inventoryCookie);
  assert.equal(users.status, 403);
  const content = await request(app).put('/api/admin/content/hero').set('Cookie', inventoryCookie).send({ headline: 'x' });
  assert.equal(content.status, 403);
});

test('category with products cannot be deleted', async () => {
  const res = await request(app).delete(`/api/admin/categories/${categoryId}`).set('Cookie', superCookie);
  assert.equal(res.status, 409);
});

test('content edits show on the storefront', async () => {
  const put = await request(app).put('/api/admin/content/hero').set('Cookie', superCookie).send({ headline: 'Hello pearls', subheadline: 'Soft and elegant' });
  assert.equal(put.status, 200, put.text);
  const res = await request(app).get('/api/content');
  assert.equal(res.body.hero.headline, 'Hello pearls');
});

test('non-image uploads are rejected', async () => {
  const res = await request(app)
    .post(`/api/admin/products/${productId}/images`)
    .set('Cookie', superCookie)
    .attach('images', Buffer.from('<?php echo 1; ?>'), { filename: 'x.png', contentType: 'image/png' });
  assert.equal(res.status, 400);
});

test('dashboard figures come from the database', async () => {
  const res = await request(app).get('/api/admin/dashboard').set('Cookie', superCookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.kpis.published, 1);
  assert.equal(res.body.kpis.drafts, 1);
  assert.equal(res.body.kpis.outOfStock, 2);
});
