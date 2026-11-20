# Chinebadam POS — Full Project Structure & Data Reference

> Restaurant Point-of-Sale System | Next.js 14 Turborepo Monorepo  
> **Frontend:** `localhost:3000` | **API Backend:** `localhost:4000`

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Directory Structure](#directory-structure)
4. [Frontend Pages (apps/web)](#frontend-pages)
5. [API Endpoints (apps/api)](#api-endpoints)
6. [Data Models & Seed Data](#data-models--seed-data)
7. [Authentication Flow](#authentication-flow)
8. [Environment Variables](#environment-variables)
9. [Tech Stack](#tech-stack)

---

## Quick Start

```bash
# From project root
cd c:\Development\chinebadam-recent

# Install dependencies
npm install

# Start both servers (API on :4000, Web on :3000)
npm run dev

# Or run apps individually
cd apps/api  &&  npm run dev   # API only  → http://localhost:4000
cd apps/web  &&  npm run dev   # Web only  → http://localhost:3000
```

**Default Login:** `admin` / `admin123`

---

## Architecture

```
Turborepo Monorepo
│
├── apps/api         Next.js 14 (API routes only, port 4000)
│     └─ In-memory store → Tables, Dishes, Orders, Users
│         JWT Auth via jsonwebtoken + bcryptjs
│
├── apps/web         Next.js 14 App Router (UI, port 3000)
│     └─ Tailwind CSS  |  Lucide Icons  |  clsx
│         fetches all data from apps/api via HTTP
│
└── packages/types   Shared TypeScript interfaces
      └─ User, Table, Dish, Order, OrderItem, DashboardStats
```

**Key design principle:** The Web app contains zero business logic.  
All data lives in the API. Web = pure UI + API client.

---

## Directory Structure

```
chinebadam-recent/
│
├── package.json              ← Turborepo root (workspaces)
├── turbo.json                ← Turbo pipeline config
├── .gitignore
├── .env.example              ← Copy → .env.local in each app
├── README.md
├── STRUCTURE.md              ← This file
│
├── packages/
│   └── types/
│       ├── package.json
│       └── index.ts          ← All shared TypeScript types
│
└── apps/
    │
    ├── api/                  ← BACKEND
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── next.config.js    ← CORS headers for localhost:3000
    │   └── src/
    │       ├── lib/
    │       │   ├── store.ts  ← In-memory DB (users, tables, dishes, orders)
    │       │   └── auth.ts   ← JWT signToken / verifyToken
    │       └── app/
    │           ├── layout.tsx
    │           ├── page.tsx
    │           └── api/
    │               ├── auth/
    │               │   ├── login/route.ts    POST  /api/auth/login
    │               │   └── me/route.ts       GET   /api/auth/me
    │               ├── tables/
    │               │   ├── route.ts          GET, POST  /api/tables
    │               │   └── [id]/route.ts     GET, PUT, DELETE  /api/tables/:id
    │               ├── dishes/
    │               │   ├── route.ts          GET, POST  /api/dishes
    │               │   └── [id]/route.ts     GET, PUT, DELETE  /api/dishes/:id
    │               ├── orders/
    │               │   ├── route.ts          GET, POST  /api/orders
    │               │   └── [id]/route.ts     GET, PUT, DELETE  /api/orders/:id
    │               └── dashboard/
    │                   └── stats/route.ts    GET  /api/dashboard/stats
    │
    └── web/                  ← FRONTEND
        ├── package.json
        ├── tsconfig.json
        ├── next.config.js    ← NEXT_PUBLIC_API_URL=http://localhost:4000
        ├── tailwind.config.js
        ├── postcss.config.js
        └── src/
            ├── lib/
            │   ├── api.ts    ← All fetch helpers (single source of truth)
            │   └── auth.ts   ← localStorage token: setToken/getToken/removeToken
            └── app/
                ├── globals.css         ← Tailwind directives + scrollbar styles
                ├── layout.tsx          ← Root layout (metadata: "Chinebadam POS")
                ├── page.tsx            ← Redirect: /login or /dashboard
                ├── login/
                │   └── page.tsx        ← Login form
                └── (dashboard)/        ← Route group (authenticated)
                    ├── layout.tsx      ← Sidebar + topbar shell
                    ├── dashboard/
                    │   └── page.tsx    ← Stats overview
                    ├── order-line/
                    │   └── page.tsx    ← Main POS page (menu + cart)
                    ├── manage-tables/
                    │   └── page.tsx    ← Table management grid
                    ├── manage-dishes/
                    │   └── page.tsx    ← Dish catalog
                    └── customers/
                        └── page.tsx    ← Customer list
```

---

## Frontend Pages

### `/login`
**File:** `apps/web/src/app/login/page.tsx`

- Centered card on teal gradient background
- Chinebadam diamond logo (teal rotated square)
- Username + Password inputs
- Animated loading spinner on submit
- Saves JWT to `localStorage` on success → redirects to `/dashboard`
- Shows red error box on failure
- Default hint shown: `admin / admin123`

---

### `/dashboard`
**File:** `apps/web/src/app/(dashboard)/dashboard/page.tsx`

Fetches `GET /api/dashboard/stats` and renders 4 stat cards:

| Card | Icon | Data |
|------|------|------|
| Total Orders | ClipboardList | `stats.totalOrders` |
| Total Revenue | DollarSign | `stats.$stats.totalRevenue` |
| Active Orders | Utensils | `stats.activeOrders` |
| Tables | Table2 | `stats.occupiedTables / stats.totalTables` |

---

### `/order-line` ⭐ Main POS Page
**File:** `apps/web/src/app/(dashboard)/order-line/page.tsx` (505 lines)

**Left panel (flex-1):**
1. **Order Line header** with active order count badge
2. **Status tabs:** All | Dine in | Wait List | Take Away | Served  
   (each with colored count chip)
3. **Order cards row** — horizontally scrollable:
   - Order #, Table #, Item count, Time ago
   - Status badge: `In Kitchen` (green) | `Wait List` (orange) | `Ready` (purple) | `Served` (gray)
4. **"Foodies Menu"** section with prev/next arrows
5. **Category tabs:** All Menu | Special | Soups | Desserts | Chickens  
   (with item count per category)
6. **Dish grid** (4 columns): colored circle avatar, category label, name, price, `−` qty `+` buttons

**Right panel (w-80):**
1. Table selector dropdown + Order # display
2. People count
3. **Ordered Items** list with qty × price per line
4. **Payment Summary:** Subtotal | Tax (10%) | Donation ($0.50) | **Total**
5. **Payment Method:** Cash | Card | Scan toggle buttons
6. **Print** + **Place Order** action buttons

---

### `/manage-tables`
**File:** `apps/web/src/app/(dashboard)/manage-tables/page.tsx`

- Grid of table cards (3 columns)
- Each card: Table number, capacity (people icon), status pill
- Status colors: `Available` = green | `Occupied` = orange | `Reserved` = blue
- "+ Add Table" button (top right)

---

### `/manage-dishes`
**File:** `apps/web/src/app/(dashboard)/manage-dishes/page.tsx`

- Category filter tabs at top
- Dish grid: colored avatar, category tag, name, price, availability toggle
- "+ Add Dish" button

---

### `/customers`
**File:** `apps/web/src/app/(dashboard)/customers/page.tsx`

- Table with columns: Name, Phone, Total Orders, Last Visit, Status
- Search input at top

---

### Dashboard Layout (Sidebar)
**File:** `apps/web/src/app/(dashboard)/layout.tsx`

Sidebar nav items:

| Label | Route | Icon |
|-------|-------|------|
| Dashboard | `/dashboard` | LayoutDashboard |
| Order Line | `/order-line` | ClipboardList |
| Manage Table | `/manage-tables` | Table2 |
| Manage Dishes | `/manage-dishes` | UtensilsCrossed |
| Customers | `/customers` | Users |
| Settings | `/settings` | Settings |
| Help Center | `/help` | HelpCircle |
| Logout | — | LogOut (red) |

Active nav item = teal bg + white text. Auto-redirects to `/login` if no token.

---

## API Endpoints

Base URL: `http://localhost:4000`

### Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| `POST` | `/api/auth/login` | `{ username, password }` | `{ token: string, user: User }` |
| `GET` | `/api/auth/me` | — (Bearer token) | `User` object |

### Tables

| Method | Path | Body | Response |
|--------|------|------|----------|
| `GET` | `/api/tables` | — | `Table[]` |
| `POST` | `/api/tables` | `{ number, capacity, status }` | `Table` |
| `GET` | `/api/tables/:id` | — | `Table` |
| `PUT` | `/api/tables/:id` | Partial `Table` | `Table` |
| `DELETE` | `/api/tables/:id` | — | `{ success: true }` |

### Dishes

| Method | Path | Query | Body | Response |
|--------|------|-------|------|----------|
| `GET` | `/api/dishes` | `?category=Special` | — | `Dish[]` |
| `POST` | `/api/dishes` | — | `{ name, category, price, description }` | `Dish` |
| `GET` | `/api/dishes/:id` | — | — | `Dish` |
| `PUT` | `/api/dishes/:id` | — | Partial `Dish` | `Dish` |
| `DELETE` | `/api/dishes/:id` | — | — | `{ success: true }` |

### Orders

| Method | Path | Query | Body | Response |
|--------|------|-------|------|----------|
| `GET` | `/api/orders` | `?status=InKitchen` | — | `Order[]` |
| `POST` | `/api/orders` | — | `{ tableId, items, paymentMethod? }` | `Order` |
| `GET` | `/api/orders/:id` | — | — | `Order` |
| `PUT` | `/api/orders/:id` | — | `{ status?, items?, paymentMethod? }` | `Order` |
| `DELETE` | `/api/orders/:id` | — | — | `{ success: true }` |

### Dashboard

| Method | Path | Response |
|--------|------|----------|
| `GET` | `/api/dashboard/stats` | `DashboardStats` |

All endpoints (except login) require `Authorization: Bearer <token>` header.

---

## Data Models & Seed Data

### TypeScript Types (`packages/types/index.ts`)

```typescript
type TableStatus  = 'Available' | 'Occupied' | 'Reserved';
type OrderStatus  = 'InKitchen' | 'WaitList' | 'Ready' | 'Served';

interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'staff';
  createdAt: string;
}

interface Table {
  id: string;
  number: number;       // 1–10
  capacity: number;     // 2, 4, or 6
  status: TableStatus;
  createdAt: string;
}

interface Dish {
  id: string;
  name: string;
  category: string;     // 'Special' | 'Soups' | 'Desserts' | 'Chickens'
  price: number;
  description: string;
  available: boolean;
  createdAt: string;
}

interface OrderItem {
  dishId: string;
  dishName: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;      // e.g. '#001'
  tableId: string;
  tableNumber: number;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;              // 10% of subtotal
  donation: number;         // fixed $0.50
  total: number;
  paymentMethod: 'Cash' | 'Card' | 'Scan' | null;
  createdAt: string;
  updatedAt: string;
}

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  totalTables: number;
  occupiedTables: number;
}
```

---

### Seed Users (1)

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | admin |

---

### Seed Tables (10)

| Table # | Capacity | Status |
|---------|----------|--------|
| 1 | 6 | Occupied |
| 2 | 2 | Occupied |
| 3 | 4 | Occupied |
| 4 | 6 | Reserved |
| 5 | 2 | Reserved |
| 6 | 4 | Available |
| 7 | 6 | Available |
| 8 | 2 | Available |
| 9 | 4 | Available |
| 10 | 6 | Available |

---

### Seed Dishes (20)

#### Special (5)

| Name | Price |
|------|-------|
| Dragon Roll Special | $18.99 |
| Chef's Signature Platter | $32.50 |
| Peking Duck | $28.00 |
| Lobster Thermidor | $45.00 |
| Wagyu Beef Steak | $55.00 |

#### Soups (5)

| Name | Price |
|------|-------|
| Tom Yum Goong | $9.99 |
| Hot & Sour Soup | $7.50 |
| Wonton Soup | $8.99 |
| Miso Soup | $5.00 |
| Pho Bo | $11.99 |

#### Desserts (5)

| Name | Price |
|------|-------|
| Mango Sticky Rice | $7.50 |
| Matcha Ice Cream | $6.00 |
| Lava Cake | $8.50 |
| Sesame Balls | $5.50 |
| Pandan Panna Cotta | $7.00 |

#### Chickens (5)

| Name | Price |
|------|-------|
| General Tso's Chicken | $14.99 |
| Hainanese Chicken Rice | $12.50 |
| Kung Pao Chicken | $13.99 |
| Lemon Chicken | $13.00 |
| Salt & Pepper Chicken Wings | $11.50 |

---

### Seed Orders (5)

| Order # | Table | Status | Items |
|---------|-------|--------|-------|
| #001 | Table 1 | InKitchen | Dragon Roll Special ×2, Hot & Sour Soup ×1 |
| #002 | Table 2 | WaitList | Hainanese Chicken Rice ×3, Matcha Ice Cream ×2 |
| #003 | Table 3 | Ready | Tom Yum Goong ×1, Lemon Chicken ×2 |
| #004 | Table 4 | Served | Peking Duck ×1 (paid by Card) |
| #005 | Table 5 | InKitchen | Pho Bo ×2, Sesame Balls ×1 |

---

## Authentication Flow

```
User enters credentials
        ↓
POST /api/auth/login  (apps/api)
        ↓
bcryptjs.compare(password, hash)
        ↓
JWT signed with secret "chinebadam-secret"
        ↓
Token saved → localStorage (apps/web)
        ↓
Every API request → Authorization: Bearer <token>
        ↓
verifyToken() middleware in each route
        ↓
401 Unauthorized → web redirects to /login
```

> **To replace with a real DB:** Edit `apps/api/src/lib/store.ts`.  
> Swap the arrays + helper functions with Prisma/Drizzle/Mongoose calls.

---

## Environment Variables

### `apps/api/.env.local`
```bash
JWT_SECRET=chinebadam-secret
PORT=4000
```

### `apps/web/.env.local`
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Monorepo | Turborepo | 2.x |
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| Icons | Lucide React | 0.400+ |
| Auth | jsonwebtoken + bcryptjs | 9.x / 2.x |
| Utilities | clsx, uuid | latest |
| Node | Node.js | 18+ |
| Package Manager | npm | 9+ |

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `teal-600` | `#0D9488` | Primary buttons, active nav, logo |
| `teal-50` | `#F0FDFA` | Login background gradient |
| `teal-100` | `#CCFBF1` | Avatar bg, hover states |
| `slate-50` | `#F8FAFC` | Main app background |
| `slate-100` | `#F1F5F9` | Sidebar hover, borders |
| `green-100/700` | — | InKitchen badge |
| `orange-100/700` | — | WaitList badge |
| `purple-100/700` | — | Ready badge |
| `slate-100/500` | — | Served badge |
| `red-500` | — | Logout button |

---

## Known Notes

- **In-memory data** resets on API server restart — no persistence layer yet
- **npm audit** shows 3 vulnerabilities from `jsonwebtoken` — expected for dev; non-blocking
- **uuid@10** deprecation warning — cosmetic only
- To add a real database: replace `apps/api/src/lib/store.ts` with Prisma + PostgreSQL
- To add image uploads for dishes: integrate Cloudinary or Next.js local `/public` uploads
