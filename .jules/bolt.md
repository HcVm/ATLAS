# Bolt's Journal

## 2024-05-22 - [Initial Setup]
**Learning:** Performance journals help track critical insights and avoid repeating mistakes.
**Action:** Consult this journal before starting optimization tasks.

## 2024-05-22 - [Batch Operations in Notifications]
**Learning:** N+1 queries in background jobs are significant bottlenecks. The `notifications` table structure allows direct batch inserts, which bypasses the `createNotification` helper but requires manual field mapping (e.g. `companyId` -> `company_id`).
**Action:** Always check if helpers support batching; if not, and batching is needed for performance, direct DB access is acceptable provided schema consistency is maintained.
