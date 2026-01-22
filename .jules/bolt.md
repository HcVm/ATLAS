## 2024-05-22 - N+1 Query in Open Data Processing
**Learning:** The `process` endpoint for open data imports had a severe N+1 query issue when checking for existing brand alerts. It was iterating through every potential alert and performing a `SELECT` and then an `INSERT`. This was solved by using a bulk `SELECT .in()` to find existing records and then performing a bulk `INSERT` for new ones.
**Action:** Always check loop bodies for database queries. Use batch fetching and bulk inserts whenever possible, especially in data processing pipelines.
