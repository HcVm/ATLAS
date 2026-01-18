## 2026-01-18 - Batching Supabase Operations
**Learning:** Supabase/PostgREST supports batch inserts and updates (using `.in()`) which can significantly reduce latency compared to sequential loops, especially for notification systems.
**Action:** Always prefer batch inserts (`.insert([...])`) and bulk updates (`.update(...).in(...)`) over sequential `await` loops for database operations.
