## 2026-01-29 - API Route N+1 Anti-Pattern
**Learning:** Found critical N+1 query pattern in `app/api/open-data/process/route.ts` where inserts were happening inside a loop with individual existence checks. This suggests a tendency in the codebase to process items iteratively.
**Action:** When working on data processing routes, always look for loops containing `await supabase...`. Refactor to `fetch-existing -> filter-in-memory -> bulk-insert` pattern.
