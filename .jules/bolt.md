## 2026-02-04 - N+1 Query in Data Processing
**Learning:** The open data import process (`app/api/open-data/process/route.ts`) contained a loop that performed individual `select` and `insert` queries for every brand alert detected. This caused significant performance overhead (2N queries) during large file uploads.
**Action:** Replace individual checks/inserts with batched `upsert` operations using `ignoreDuplicates: true` and appropriate `onConflict` clauses. Ensure the database schema supports the unique constraints required for efficient upserts.
