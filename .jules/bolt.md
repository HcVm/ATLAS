## 2024-05-23 - [Supabase Batch Fetch Fallback]
**Learning:** Large batches in Supabase `.in()` queries can exceed URL length limits (approx 2-8KB) causing request failures (HTTP 414).
**Action:** Use smaller batch sizes (e.g., 100) for `.in()` queries involving string IDs and implement a fallback to individual processing to ensure reliability.
