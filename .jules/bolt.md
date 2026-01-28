## 2024-05-22 - Batch Processing for Notifications
**Learning:** Scheduled tasks that process multiple records (like attendance checks) can easily cause N+1 query performance issues if they iterate and insert/update records individually.
**Action:** Always prefer batch operations (`.insert([...])` and `.in('id', ids).update(...)`) for background jobs or scheduled tasks to minimize database roundtrips. Even if a helper function exists for single records, bypass it or create a batch variant for bulk processing.
