/* eslint-disable no-console */
// Seeds the first Super Admin, default storefront content and (optionally) sample catalog data.
// Safe to run more than once: existing records are left alone.
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CATEGORIES = [
  ['Bags & Wallets', 'bags', 'Totes, clutches, crossbody bags and wallets.'],
  ['Jewelry', 'jewelry', 'Necklaces, earrings, rings and bracelets.'],
  ['Watches', 'watches', 'Everyday and statement timepieces.'],
  ['Eyewear', 'eyewear', 'Sunglasses and blue-light frames.'],
  ['Hair Accessories', 'hair', 'Clips, scrunchies, headbands and bows.'],
  ['Fashion Accessories', 'fashion', 'Scarves, belts, hats and more.'],
  ['Tech Accessories', 'tech', 'Phone cases, AirPod cases and charms.'],
  ['Beauty Accessories', 'beauty', 'Pouches, mirrors and vanity organisers.'],
];

const PRODUCTS = [
  ['Pearl Mini Crossbody Bag', 'bags', 3450, 4200, 1800, 14, ['Beige', 'Ivory'], [], ['pearl', 'gift'], { isFeatured: true, isNewArrival: true }],
  ['Quilted Cream Clutch', 'bags', 2890, null, 1500, 6, ['Cream', 'Black'], [], ['party'], { isBestSeller: true }],
  ['Slim Leather Card Wallet', 'bags', 1290, 1590, 600, 22, ['Tan', 'Rose'], [], ['leather', 'gift'], {}],
  ['Gold Hoop Earrings', 'jewelry', 990, null, 350, 30, ['Gold'], [], ['gold', 'everyday'], { isBestSeller: true, isFeatured: true }],
  ['Freshwater Pearl Necklace', 'jewelry', 2450, 2990, 1100, 4, ['Pearl'], [], ['pearl', 'gift'], { isNewArrival: true, isFeatured: true }],
  ['Dainty Heart Bracelet', 'jewelry', 790, null, 260, 18, ['Gold', 'Silver'], [], ['heart', 'gift'], { isNewArrival: true }],
  ['Champagne Mesh Watch', 'watches', 4990, 5990, 2600, 7, ['Champagne', 'Rose Gold'], [], ['minimal'], { isFeatured: true }],
  ['Classic Leather Strap Watch', 'watches', 3790, null, 2000, 0, ['Brown'], [], ['classic'], {}],
  ['Cat-Eye Sunglasses', 'eyewear', 1690, 1990, 700, 12, ['Tortoise', 'Black'], [], ['summer'], { isBestSeller: true }],
  ['Blue-Light Round Frames', 'eyewear', 1490, null, 600, 9, ['Clear', 'Gold'], [], ['work'], { isNewArrival: true }],
  ['Satin Scrunchie Set (3 pcs)', 'hair', 590, null, 180, 40, ['Beige', 'Rose', 'Ivory'], [], ['satin', 'set'], { isBestSeller: true }],
  ['Pearl Claw Clip', 'hair', 690, 850, 220, 3, ['Ivory'], ['Small', 'Large'], ['pearl'], { isNewArrival: true, isFeatured: true }],
  ['Silk Twill Scarf', 'fashion', 1890, null, 800, 11, ['Beige', 'Rose'], [], ['silk'], {}],
  ['Woven Bucket Hat', 'fashion', 1390, 1690, 550, 8, ['Natural'], ['S/M', 'L/XL'], ['summer'], {}],
  ['Floral iPhone Case', 'tech', 990, null, 300, 25, ['Rose', 'Beige'], ['iPhone 15', 'iPhone 16'], ['floral'], { isNewArrival: true }],
  ['Quilted AirPods Case', 'tech', 890, 1090, 280, 2, ['Cream'], [], ['gift'], {}],
  ['Vanity Travel Pouch', 'beauty', 1190, null, 450, 16, ['Beige', 'Dusty Rose'], [], ['travel'], { isBestSeller: true }],
  ['Pearl-Rim Compact Mirror', 'beauty', 650, null, 200, 20, ['Ivory'], [], ['pearl', 'gift'], {}],
];

const CONTENT = {
  store: { name: 'Adcessories', tagline: 'Little luxuries for every day', currency: 'NPR', announcement: 'New pearl collection just landed ✨' },
  hero: {
    headline: 'Soft, elegant accessories for every day',
    subheadline: 'Discover handpicked bags, jewelry and little luxuries in warm neutral tones.',
    ctaLabel: 'Shop Now',
    ctaLink: '/shop',
    imageUrl: '/samples/hero.svg',
  },
  about: {
    title: 'Our story',
    body: 'We are a small accessories boutique based in Nepal. We pick pieces that feel premium, gentle and easy to wear, so you can add a little joy to every outfit.\n\nEvery item is checked by hand before it reaches you.',
    imageUrl: '/samples/about.svg',
  },
  contact: {
    email: 'hello@example.com',
    phone: '+977 98XXXXXXXX',
    whatsapp: '',
    address: 'Kathmandu, Nepal',
    hours: 'Sun to Fri, 10 AM to 7 PM',
    mapUrl: '',
  },
  social: { instagram: '', facebook: '', tiktok: '' },
  policies: {
    shipping: 'We deliver across Nepal. Delivery inside Kathmandu Valley usually takes 1 to 2 days, and 3 to 5 days elsewhere.',
    returns: 'Unused items in original packaging can be exchanged within 7 days of delivery.',
    privacy: 'We only use your contact details to respond to your enquiries. We never sell your data.',
    terms: 'Prices and availability may change without notice. Product colours may vary slightly from photos.',
  },
  testimonials: {
    items: [
      { name: 'Aasha', text: 'The pearl clip is even prettier in person. Lovely packaging too!', location: 'Kathmandu' },
      { name: 'Riya', text: 'Quality is amazing for the price. My go-to gift shop now.', location: 'Pokhara' },
      { name: 'Sneha', text: 'Elegant pieces and super quick replies on enquiries.', location: 'Lalitpur' },
    ],
  },
  faq: {
    items: [
      { q: 'How do I order?', a: 'Message us on the contact page with the product name or SKU and we will confirm availability.' },
      { q: 'Do you deliver outside Kathmandu?', a: 'Yes, we deliver across Nepal.' },
    ],
  },
};

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  let admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) {
    admin = await prisma.adminUser.create({
      data: { name: process.env.ADMIN_NAME || 'Store Owner', email, role: 'SUPER_ADMIN', passwordHash: await bcrypt.hash(password, 12) },
    });
    console.log(`Created Super Admin ${email}`);
  }

  for (const [key, value] of Object.entries(CONTENT)) {
    await prisma.siteContent.upsert({ where: { key }, create: { key, value }, update: {} });
  }

  const withSamples = (process.env.SEED_SAMPLE_DATA || 'true') === 'true';
  if (!withSamples || (await prisma.product.count()) > 0) {
    console.log('Skipping sample catalog data');
    return;
  }

  const catIds = {};
  for (const [i, [name, key, description]] of CATEGORIES.entries()) {
    const slug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const c = await prisma.category.upsert({
      where: { slug },
      create: { name, slug, description, sortOrder: i, imageUrl: `/samples/${key}.svg` },
      update: {},
    });
    catIds[key] = c.id;
  }

  for (const [i, [name, cat, price, compareAt, cost, stock, colors, sizes, tags, flags]] of PRODUCTS.entries()) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        sku: `ADC-${String(i + 1).padStart(4, '0')}`,
        description: `${name} from our ${cat} edit. A soft, elegant piece that pairs easily with everyday outfits and makes a lovely gift.`,
        specifications: 'Material: see product label\nCare: wipe gently with a soft dry cloth',
        price,
        compareAtPrice: compareAt,
        costPrice: cost,
        stock: 0,
        colors,
        sizes,
        tags,
        status: 'PUBLISHED',
        categoryId: catIds[cat],
        ...flags,
        images: { create: [{ url: `/samples/${cat}.svg`, alt: name, sortOrder: 0 }] },
      },
    });
    if (stock > 0) {
      await prisma.$transaction([
        prisma.product.update({ where: { id: product.id }, data: { stock } }),
        prisma.stockMovement.create({
          data: { productId: product.id, type: 'STOCK_IN', quantity: stock, before: 0, after: stock, reason: 'Opening stock (seed)', reference: 'seed', actorId: admin.id },
        }),
      ]);
    }
  }
  console.log(`Seeded ${CATEGORIES.length} categories and ${PRODUCTS.length} sample products`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
