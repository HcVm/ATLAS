## 2025-05-18 - Batch Upsert for Brand Alerts
**Learning:** Sequential N+1 existence checks (Select+Insert) can be replaced by a single batch `upsert` with `ignoreDuplicates: true` and `onConflict` constraint, reducing O(N) queries to O(1) per batch.
**Action:** Look for `for` loops iterating over database insertions with `check if exists` logic and refactor to batch `upsert`.
