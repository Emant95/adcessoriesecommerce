const slugify = require('slugify');

const toSlug = (text) => slugify(String(text || ''), { lower: true, strict: true, trim: true }) || 'item';

// Produce a slug that is unique for the given Prisma model delegate.
async function uniqueSlug(delegate, base, excludeId) {
  const root = toSlug(base);
  let candidate = root;
  for (let i = 2; ; i += 1) {
    const existing = await delegate.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${i}`;
  }
}

module.exports = { toSlug, uniqueSlug };
