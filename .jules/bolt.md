## 2024-05-23 - Eliminating N+1 Queries with Supabase Joins
**Learning:** The codebase contained manual N+1 query patterns (fetching IDs then fetching related data in parallel) instead of utilizing Supabase's powerful join capabilities (e.g., `brands!products_brand_id_fkey(name)`).
**Action:** Always check for foreign key relationships and use nested selects in the main query to fetch related data in a single roundtrip.
