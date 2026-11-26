const express = require('express');
const { z } = require('zod');
const prisma = require('../../lib/prisma');
const { asyncHandler, badRequest } = require('../../lib/errors');
const { validate } = require('../../middleware/validate');
const { audit } = require('../../lib/audit');
const { upload, verifyUploaded } = require('../../lib/upload');

const router = express.Router();

const str = (max = 500) => z.string().trim().max(max).default('');
const url = z.string().trim().max(500).default('');

// Each editable storefront section has its own schema so bad data cannot reach the site.
const SCHEMAS = {
  store: z.object({ name: str(100), tagline: str(200), currency: str(10), announcement: str(200) }),
  hero: z.object({ headline: str(150), subheadline: str(400), ctaLabel: str(40), ctaLink: str(200), imageUrl: url }),
  about: z.object({ title: str(150), body: str(10_000), imageUrl: url }),
  contact: z.object({ email: str(200), phone: str(50), whatsapp: str(50), address: str(300), hours: str(200), mapUrl: url }),
  social: z.object({ instagram: url, facebook: url, tiktok: url }),
  policies: z.object({
    shipping: str(10_000),
    returns: str(10_000),
    privacy: str(10_000),
    terms: str(10_000),
  }),
  testimonials: z.object({
    items: z.array(z.object({ name: str(100), text: str(500), location: str(100) })).max(12).default([]),
  }),
  faq: z.object({ items: z.array(z.object({ q: str(300), a: str(2000) })).max(30).default([]) }),
};

router.get('/', asyncHandler(async (req, res) => {
  const rows = await prisma.siteContent.findMany();
  res.json({ content: Object.fromEntries(rows.map((r) => [r.key, r.value])), sections: Object.keys(SCHEMAS) });
}));

router.put('/:key', asyncHandler(async (req, res, next) => {
  const schema = SCHEMAS[req.params.key];
  if (!schema) throw badRequest('Unknown content section');
  validate(schema)(req, res, async (err) => {
    if (err) return next(err);
    try {
      const row = await prisma.siteContent.upsert({
        where: { key: req.params.key },
        create: { key: req.params.key, value: req.body },
        update: { value: req.body },
      });
      await audit(req, 'update', 'SiteContent', req.params.key);
      res.json({ key: row.key, value: row.value });
    } catch (e) {
      next(e);
    }
  });
}));

// Generic image upload for content sections (hero, about...). Returns the URL to save.
router.post('/upload', upload.single('image'), asyncHandler(async (req, res) => {
  const [imageUrl] = verifyUploaded(req.file);
  if (!imageUrl) throw badRequest('Choose an image');
  res.status(201).json({ url: imageUrl });
}));

module.exports = { router, SCHEMAS };
