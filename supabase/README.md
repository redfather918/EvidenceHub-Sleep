# Supabase Configuration

## Setup

1. Create a new Supabase project at https://supabase.com
2. Run `migrations/001_initial_schema.sql` in the SQL Editor
3. Copy the connection string to `.env`:
   ```
   DATABASE_URL="postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres"
   ```

## Migrations

- `001_initial_schema.sql` — 15-table Knowledge Graph schema (PostgreSQL)
