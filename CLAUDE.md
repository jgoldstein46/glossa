# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Glossa is an AI-powered language learning platform built with Next.js 16 (App Router). Users create learning modules by providing a topic and language — the system generates structured content via OpenAI, audio narration via ElevenLabs, and spaced-repetition quizzes.

## Commands

```bash
pnpm run dev          # Start dev server (localhost:3000)
pnpm run build        # Production build
pnpm run lint         # ESLint
pnpm run format       # Format all files with Prettier
pnpm run format:check # Check formatting without writing
pnpm run generate:api # Regenerate OpenAPI client types from openapi.yaml → lib/api/client/
```

## Code Style

After editing files, run `pnpm run format` (or `pnpm prettier --write <file>` for specific files) to ensure consistent formatting.

## Tech Stack

- **Framework:** Next.js 16, React 19, TypeScript 5 (strict mode)
- **Package manager:** pnpm
- **Database:** Supabase (PostgreSQL with RLS, Realtime subscriptions)
- **Auth:** Supabase Auth with Google OAuth
- **AI:** OpenAI GPT-5-nano (content generation, quiz evaluation)
- **TTS:** ElevenLabs (multilingual audio, stored in Supabase Storage)
- **Billing:** Flowglad (token-based usage tracking)
- **UI:** Tailwind CSS 4, shadcn/ui (new-york style), Radix UI, Lucide icons
- **Font:** Karla (Google Fonts)

## Architecture

### App Structure (Next.js App Router)

- `app/api/` — REST API routes following resource-based patterns (modules, sections, quizzes, quiz-results, profiles, progress)
- `app/(pages)/` — Pages: landing (`/`), login, home (module dashboard), module player (`/modules/[id]`), quizzes, pricing
- `components/` — React components; `components/ui/` contains shadcn primitives
- `hooks/module/use-module.tsx` — Core hook managing module data with Supabase Realtime subscriptions
- `lib/services/` — Business logic: `moduleGeneration.ts` (content+audio pipeline), `audioGeneration.ts`, `quizEvaluation.ts`
- `lib/api/client/` — Auto-generated OpenAPI SDK (do not edit manually; regenerate with `pnpm run generate:api`)
- `lib/supabase/` — Client factories: `client.ts` (browser), `server.ts` (server-side with cookies)
- `lib/openai/` — OpenAI client, JSON schemas for structured output, evaluation logic
- `lib/elevenlabs/` — ElevenLabs client and language→voice mapping
- `types/database.ts` — TypeScript types for all database entities

### Module Generation Pipeline

1. User provides title + language → POST `/api/modules`
2. OpenAI generates structured content (5 sections with key points + 3 quiz questions each) using JSON Schema validation
3. ElevenLabs generates audio per section → uploaded to Supabase Storage (`audio/{moduleId}/{sectionId}.mp3`)
4. Progress tracked in `module_generation_status` table with Realtime subscriptions for live UI updates
5. Regeneration endpoints available for content and audio separately

### API Response Format

All API routes return consistent JSON: `{ success: true, data: ... }` or `{ success: false, error: "...", details?: "..." }`. Paginated responses include `{ pagination: { total, limit, offset, hasMore } }`.

### Auth Pattern

- `lib/api/auth.ts` exports `requireAuth()` (returns 401 if unauthenticated) and `optionalAuth()`
- `proxy.ts` acts as auth middleware for protected routes
- Server-side uses `createSupabaseServerClient()` with cookie-based sessions
- Public routes: `/`, `/login`, `/auth/callback`

### Database

- Migrations in `supabase/migrations/` (numbered sequentially)
- RLS enabled on all tables — use `SUPABASE_SERVICE_ROLE_KEY` to bypass in server-side operations
- Key tables: `modules`, `sections`, `quizzes`, `quiz_results`, `user_module_progress`, `module_generation_status`, `profiles`
- Database columns use snake_case; TypeScript types use PascalCase

### Path Alias

`@/*` maps to project root (configured in tsconfig.json).
