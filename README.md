# EvidenceHub Sleep

> AI-driven evidence-based sleep knowledge system. A computable knowledge graph for sleep science.

## Overview

EvidenceHub Sleep transforms sleep-related scientific research into a **Claim Graph** — a structured, computable knowledge base where every claim is scored, linked to studies, and AI-ready.

This is not a content website. It is a knowledge database.

## Features

- **Claim Graph**: Every claim links to studies, doses, populations, mechanisms, and limitations
- **Evidence Scoring**: 0-100 score based on human RCTs, meta-analyses, mechanism, and safety
- **Structured API**: REST endpoints designed for AI consumption (ChatGPT, Claude, Gemini)
- **SEO + GEO**: JSON-LD structured data for search engines and AI answer engines
- **Search**: Full-text search across all claims

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Database | Prisma ORM + SQLite (MVP) |
| API | Next.js Route Handlers (REST) |
| SEO | JSON-LD Schema + Sitemap |
| Deployment | Vercel |

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to SQLite
npm run db:push

# Seed the database
npm run db:seed

# Start dev server
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
evidencehub-sleep/
├── prisma/
│   ├── schema.prisma      # Claim Graph data model
│   └── seed.ts             # Database seeder
├── src/
│   ├── app/
│   │   ├── page.tsx            # Homepage (search + trending)
│   │   ├── claim/[slug]/       # Claim detail (core page)
│   │   ├── claims/             # All claims listing
│   │   ├── topics/             # Topics listing + detail
│   │   ├── search/             # Search page
│   │   ├── api-docs/           # API documentation
│   │   ├── api/
│   │   │   ├── claim/[slug]/   # Claim API
│   │   │   ├── evidence/[topic]/ # Evidence API
│   │   │   └── search/         # Search API
│   │   ├── sitemap.ts          # Dynamic sitemap
│   │   └── robots.ts           # Robots.txt
│   ├── components/
│   │   ├── ClaimCard.tsx
│   │   ├── EvidenceScoreBadge.tsx
│   │   └── StarRating.tsx
│   ├── data/
│   │   └── seed-data.ts        # Static data (11 claims, 15 studies)
│   └── lib/
│       ├── types.ts            # TypeScript types
│       ├── data.ts             # Data access layer
│       └── seo.ts              # JSON-LD generators
├── docs/
│   ├── PRD.md                   # Product Requirements Document
│   ├── TRD.md                   # Technical Requirements Document
│   └── OPERATION-MANUAL.md      # Product Operation Manual
└── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/claim/{slug}` | Get structured claim data |
| GET | `/api/evidence/{topic}` | Get aggregated evidence for a topic |
| GET | `/api/search?q={query}` | Search claims |

No authentication required during MVP.

## Data

- 11 evidence-backed claims
- 15 studies (with PubMed references)
- 8 topics (Glycine, Magnesium, Melatonin, Tart Cherry, L-Theanine, Ashwagandha, Apigenin, Exercise)
- Full dose-response, mechanism, population fit, and limitation data per claim

## License

MIT

---

*Not medical advice. Evidence is for educational purposes. Always consult a healthcare professional.*
