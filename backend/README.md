# Bonnie-Snipbox Backend (Express + Supabase)

Node.js Express API server connected to Supabase (PostgreSQL) for managing shared snippets and collections.

## Features
- **Database**: Supabase PostgreSQL with schema defined in `schema.sql`
- **Endpoints**:
  - `GET /api/health`: Health check endpoint
  - `GET /api/bootstrap`: Loads all active collections and snippets in one call
  - `GET /api/snippets`: List active snippets (optionally filter by `?categoryId=`)
  - `POST /api/snippets`: Create or upsert a snippet
  - `PUT /api/snippets/:id`: Update an existing snippet
  - `DELETE /api/snippets/:id`: Soft delete a snippet
  - `GET /api/collections`: List active collections
  - `POST /api/collections`: Create or upsert a collection
  - `PUT /api/collections/:id`: Update a collection
  - `DELETE /api/collections/:id`: Soft delete a collection

## Supabase Database Setup

1. Log into your [Supabase Dashboard](https://supabase.com).
2. Create a new project (or use an existing one).
3. Open the **SQL Editor** in Supabase and paste the contents of `schema.sql`.
4. Click **Run** to create the tables, indexes, RLS policies, and seed data.
5. In your Supabase project settings (**Settings → API**), copy:
   - **Project URL**
   - **anon / public key** or **service_role key**

## Local Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in your Supabase credentials in `.env`:
   ```env
   PORT=3001
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-key
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run in development mode:
   ```bash
   npm run dev
   ```
5. Run tests:
   ```bash
   npm test
   ```
