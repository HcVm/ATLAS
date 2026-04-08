## 2024-05-23 - Handling Empty Payloads in Batch Optimizations
**Learning:** When refactoring N+1 loops to batch database operations (e.g., `supabase.insert([])`), always explicitly check for empty arrays before executing the query. Some client libraries or database drivers throw errors on empty payloads, whereas a loop simply wouldn't iterate.
**Action:** Add `if (items.length === 0) return;` checks before any batch database operation.
