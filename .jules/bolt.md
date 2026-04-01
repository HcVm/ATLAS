## 2024-05-23 - [Batch Insertions vs Helper Functions]
**Learning:** The `createNotification` helper is convenient but forces single-row inserts, leading to N+1 performance issues in loops. For batch operations, bypass the helper and use `supabase.from('notifications').insert([...])` directly.
**Action:** When optimizing loops that send notifications, refactor to collect data arrays and perform a single batch insert.
