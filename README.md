# Adcessories: accessories catalog website

A soft, white-and-beige boutique website for showing accessories, with a private admin portal to manage everything on it.

* **Storefront** shows products only. There is **no cart, checkout or online payment**. Shoppers browse, search, filter and save favourites, then enquire about an item by WhatsApp or email.
* **Admin portal** (`/admin`) lets you add and edit products, images, categories, stock and all the page text, with sign-in and roles.

Built from the project FRD, with the ordering and payment parts left out on purpose.

---

## What's included

### Storefront
| Page | What it does |
|---|---|
| Home | Editable hero banner, shop by category, New arrivals, Best sellers, Featured picks, On sale, customer testimonials |
| Shop / Category / New arrivals / Best sellers | Filters by category, price, colour, size, tags, in stock, on sale. Sorting by newest, price, popularity, best selling. Pagination |
| Product | Image gallery with hover zoom, price and discount, availability, colours and sizes, description, delivery info, related and recently viewed products, "Enquire on WhatsApp / by email" buttons |
| Quick view | Product preview pop-up from any product card |
| Wishlist | Hearts saved in the browser (no account needed) |
| About, Contact & FAQ, Policies | All text is edited from the admin portal |
| SEO | Friendly URLs, page titles and descriptions, product structured data, `sitemap.xml`, `robots.txt` |

Design follows the FRD palette (warm white `#FFFEFC`, cream beige `#F5EEE6`, ivory `#FAF6F1`, champagne gold `#C99A63`, dusty rose `#E8CFC7`, espresso `#39291F`, warm gray `#897D73`) with Playfair Display headings and DM Sans body text. Animations use Framer Motion and respect the "reduce motion" setting.

### Admin portal (`/admin`)
* **Dashboard**: live product counts, drafts, low stock, out of stock, units on hand, stock value at cost and retail, products per category chart, most viewed, recent stock changes.
* **Products**: create, edit, publish, unpublish, archive, delete; unique SKU; selling, original and cost price; colours, sizes, tags; featured / new arrival / best seller flags; multiple images with reorder and "main image"; search, filters, bulk actions and CSV export.
* **Categories**: create, edit, reorder, hide/show, one level of subcategories, category images. A category can't be deleted while products are still in it.
* **Stock**: every change is a recorded movement (stock in, stock out, return, damaged, manual correction) with before/after quantity, reason, reference, who and when. Stock can never go negative, and simultaneous updates are safe (row locking inside a transaction).
* **Site content**: store name and announcement bar, hero, About, contact details and WhatsApp number, social links, policies, testimonials, FAQ. Changes appear on the site immediately.
* **Admin users and roles**: Super Admin, Store Manager, Inventory Manager, Content Manager. Permissions are checked on the server for every action.
* **Activity log** of admin changes, and **change password** for each admin.

### Not included (by request)
Cart, checkout, orders, payments (COD, eSewa, Khalti, Fonepay), customer accounts, coupons and reviews from the FRD are intentionally left out. The database and API are modular, so they can be added later.

---

## Tech stack
| Part | Technology |
|---|---|
| Website + admin | React 18, Vite, Tailwind CSS, Framer Motion, Lucide icons, Recharts |
| API | Node.js 20, Express, Zod validation |
| Database | PostgreSQL 16 with Prisma ORM and migrations |
| Auth | JWT in an httpOnly, SameSite=strict cookie; bcrypt password hashing; login rate limiting |
| Images | Uploaded to the server (Docker volume), validated by type, size and file signature |
| Deployment | Docker Compose: `db` (Postgres) + `api` (Express) + `web` (nginx serving the site and proxying `/api`) |

```
.
├── backend/              Express API, Prisma schema, migrations, seed, tests
├── frontend/             React storefront + admin portal, nginx config
├── scripts/
│   ├── deploy.sh         build and start everything with Docker (creates .env with random secrets)
│   ├── dev.sh            local development with hot reload
│   ├── setup-server.sh   install Docker on a fresh Ubuntu server
│   ├── backup-db.sh      back up database + uploaded images
│   └── restore-db.sh     restore a backup
├── docker-compose.yml        production stack
├── docker-compose.dev.yml    Postgres only, for local development
└── .env.example
```

---

## Run it locally

### Option A: everything in Docker (closest to production)
Needs [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine with Compose.

```bash
git clone https://github.com/Emant95/adcessoriesecommerce.git
cd adcessoriesecommerce
./scripts/deploy.sh
```

The first run creates `.env` with random passwords and prints the admin login. Then open:

* Store: http://localhost:8080
* Admin: http://localhost:8080/admin

On Windows without bash, do it by hand: `copy .env.example .env`, edit the passwords in `.env`, then `docker compose up -d --build`.

### Option B: development mode with hot reload
Needs Node.js 20+ and Docker (for the database).

```bash
./scripts/dev.sh
```

Or step by step:

```bash
docker compose -f docker-compose.dev.yml up -d        # PostgreSQL on localhost:5432

cd backend
cp .env.example .env
npm install
npx prisma migrate deploy                              # create tables
npm run seed                                           # admin user, default content, sample products
npm run dev                                            # API on http://localhost:4000

# in a second terminal
cd frontend
npm install
npm run dev                                            # site on http://localhost:5173
```

Default development admin: `admin@example.com` / `ChangeMe123!` (set in `backend/.env`). Change it after signing in.

### Sample data
The seed adds 8 categories (Bags & Wallets, Jewelry, Watches, Eyewear, Hair, Fashion, Tech and Beauty Accessories) and 18 sample products with placeholder illustrations so the site isn't empty. Set `SEED_SAMPLE_DATA=false` before the first start to begin with an empty catalog, or delete/archive the samples in the admin portal. The seed never overwrites existing data.

---

## Deploy to a server (DigitalOcean, AWS EC2, any VPS)

1. Create an Ubuntu 22.04/24.04 server (1 GB RAM is enough to start) and point your domain's DNS to it.
2. On the server:
   ```bash
   git clone https://github.com/Emant95/adcessoriesecommerce.git /opt/adcessoriesecommerce
   cd /opt/adcessoriesecommerce
   sudo ./scripts/setup-server.sh        # installs Docker, opens ports 80/443
   cp .env.example .env && nano .env      # set passwords, PUBLIC_SITE_URL=https://yourdomain.com, WEB_PORT=80
   ./scripts/deploy.sh
   ```
3. **HTTPS**: put a TLS proxy in front. The simplest is [Caddy](https://caddyserver.com/): set `WEB_PORT=8080` in `.env`, install Caddy, and use this `/etc/caddy/Caddyfile`:
   ```
   yourdomain.com {
     reverse_proxy localhost:8080
   }
   ```
   Caddy gets and renews the certificate automatically. Then set `COOKIE_SECURE=true` in `.env` and run `./scripts/deploy.sh` again.
4. **Updates**: `./scripts/deploy.sh` pulls the latest code, rebuilds and restarts. Database migrations run automatically when the API starts.
5. **Backups**: `./scripts/backup-db.sh` saves the database and uploaded images to `backups/`. Schedule it daily with cron (example inside the script) and copy `backups/` off the server. Restore with `./scripts/restore-db.sh backups/<timestamp>`.

### Environment variables (`.env`)
| Variable | Purpose |
|---|---|
| `POSTGRES_PASSWORD` | Database password |
| `JWT_SECRET` | Secret for admin sessions (long random string) |
| `PUBLIC_SITE_URL` | Public address, used for CORS and the sitemap |
| `WEB_PORT` | Port the site is published on (default 8080) |
| `COOKIE_SECURE` | `true` once served over HTTPS |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | First Super Admin, created on first start only |
| `SEED_SAMPLE_DATA` | Load sample categories/products on first start |
| `MAX_UPLOAD_MB` | Max size of each uploaded image |

---

## Using the admin portal
1. Sign in at `/admin`.
2. **Site content**: set your store name, contact email, phone and **WhatsApp number** (with country code, e.g. `9779800000000`). The WhatsApp number turns on the "Enquire on WhatsApp" button on every product.
3. **Categories**: adjust or add categories and upload category images.
4. **Products → Add product**: fill in name, SKU, category, price, opening stock, upload photos, set status to *Published*. It appears on the store straight away.
5. Record new deliveries, sales and corrections from the **Stock** panel on a product's page. The full history is under **Stock history**.
6. Add staff under **Admin users** with the role they need.

---

## API overview
Public (no sign-in):

| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | Published products. Query: `search, category, minPrice, maxPrice, colors, sizes, tags, inStock, onSale, featured, newArrival, bestSeller, sort, page, limit` |
| GET | `/api/products/:slug` | Product details + related products |
| GET | `/api/filters` | Available colours, sizes, tags and price range |
| GET | `/api/categories`, `/api/categories/:slug` | Active categories |
| GET | `/api/content` | All editable site content |
| GET | `/api/sitemap.xml`, `/api/health` | Sitemap, health check |

Admin (`/api/admin`, signed-in cookie, permission per role):

| Method | Path | Permission |
|---|---|---|
| POST | `/auth/login`, `/auth/logout`, `/auth/change-password`; GET `/auth/me` | any admin |
| GET | `/dashboard` | dashboard:view |
| GET | `/products`, `/products/:id`, `/products/export.csv`, `/products/:id/movements` | any admin |
| POST/PUT/DELETE | `/products`, `/products/:id`, `/products/bulk`, `/products/:id/images`, `/products/:id/images/order`, `/products/:id/images/:imageId` | products:write |
| POST | `/products/:id/stock` | inventory:write |
| GET | `/inventory/movements` | inventory:write |
| GET / POST / PUT / DELETE | `/categories`, `/categories/:id`, `/categories/:id/image` | read: any admin; write: categories:write |
| GET / PUT / POST | `/content`, `/content/:key`, `/content/upload` | content:write |
| GET / POST / PUT | `/users`, `/users/:id` | users:manage |
| GET | `/audit` | audit:view |

Errors always look like `{ "error": { "message": "...", "details": [{ "field": "...", "message": "..." }] } }`.

---

## Tests
The API has integration tests (login, permissions, product creation, storefront visibility, stock rules including parallel updates that must not oversell, uploads, content). They need an empty test database:

```bash
cd backend
export DATABASE_URL=postgresql://adcessories:adcessories@localhost:5432/adcessories_test
npx prisma migrate deploy
npm test
```

**Warning:** the tests empty every table in that database first, so never point them at real data.

## Security notes
* Passwords hashed with bcrypt; admin sessions in httpOnly SameSite=strict cookies; login attempts rate limited.
* Every admin endpoint checks the role's permission on the server.
* All input validated with Zod; Prisma parameterised queries; CSV export guarded against spreadsheet formula injection.
* Uploads limited to JPG/PNG/WEBP/GIF/AVIF, checked by file signature, size limited, stored with random names.
* Helmet security headers; secrets only in `.env` (never committed).
