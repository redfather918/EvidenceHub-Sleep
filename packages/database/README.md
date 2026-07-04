# @evidencehub/database

Production-grade Prisma schema for the EvidenceHub Knowledge Graph.

## 15 Tables

| # | Table | Purpose |
|---|---|---|
| 1 | topics | Hierarchical topics (Magnesium, Glycine, ...) |
| 2 | claims | Core claim statements |
| 3 | studies | Research papers (PubMed) |
| 4 | claim_study_map | Claim-Study relationships (strength + direction) |
| 5 | evidence_metrics | Computed scoring (6 dimensions) |
| 6 | dose_mappings | Dose-response data |
| 7 | population_fits | Population suitability |
| 8 | faqs | Per-claim FAQs (normalized) |
| 9 | products | Affiliate products |
| 10 | claim_products | Claim-Product mapping |
| 11 | content_assets | Multi-channel content (Web/Podcast/Video/Social/Newsletter) |
| 12 | references | External citations |
| 13 | pipeline_runs | Pipeline execution logs |
| 14 | api_keys | API key management |
| 15 | api_usage_logs | API usage tracking |

## Usage

```bash
# Generate Prisma client
npm run generate

# Push schema to database
npm run push

# Run migrations
npm run migrate

# Seed data
npm run seed
```

## Database

- **Development**: SQLite (file:./dev.db)
- **Production**: PostgreSQL (Supabase)
- **ORM**: Prisma 5.x
