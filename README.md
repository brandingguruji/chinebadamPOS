# Chinebadam POS

A restaurant Point-of-Sale system built with Next.js in a Turborepo monorepo.

## Structure

```
chinebadam-recent/
├── apps/
│   ├── api/    Next.js API backend  (port 4000)
│   └── web/    Next.js UX frontend  (port 3000)
└── packages/
    └── types/  Shared TypeScript interfaces
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run dev
```

This starts both apps concurrently via Turborepo:
- **API**: http://localhost:4000
- **Web**: http://localhost:3000

### Default credentials
- Username: `admin`
- Password: `admin123`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps |
| `npm run lint` | Lint all apps |

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: JWT (jsonwebtoken)
- **Monorepo**: Turborepo
- **Icons**: Lucide React
