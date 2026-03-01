# TODO — Glossa Improvement Backlog

## Module Generation

- [ ] Add retry logic for transient OpenAI / ElevenLabs failures (exponential back-off)
- [ ] Stream generation status updates via Supabase Realtime instead of polling
- [ ] Add input validation (title length, language allowlist) before generation starts
- [ ] Consider a queue-based architecture (e.g., Inngest) for long-running generation jobs
- [ ] Add idempotency keys to prevent duplicate module creation on retry

## Database

- [ ] Add database indexes on `sections.module_id` and `quizzes.section_id` if not present
- [ ] Audit RLS policies — ensure creator-only write access on modules
- [ ] Add soft-delete support for modules instead of hard cascade deletes

## Audio

- [ ] Support configurable concurrency for ElevenLabs (paid plans allow parallel requests)
- [ ] Add audio duration metadata to sections after upload
- [ ] Consider caching common phrases to reduce TTS API calls

## Testing

- [ ] Add integration tests against a Supabase test project
- [ ] Add E2E tests for the module creation flow (Playwright)
- [ ] Add tests for `audioGeneration.ts` and `quizEvaluation.ts`

## Code Quality

- [ ] Remove unused `processWithConcurrency` helper in `audioGeneration.ts`
- [ ] Add OpenAPI spec validation in CI (`pnpm run generate:api` should produce no diff)
- [ ] Set up GitHub Actions CI pipeline (lint, format check, type check, test)
