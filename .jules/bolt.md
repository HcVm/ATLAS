## 2024-05-22 - Prevent Stack Overflow in Aggregations
**Learning:** Using `Math.min(...array)` or `Math.max(...array)` on large datasets (e.g., >65k items) causes `RangeError: Maximum call stack size exceeded`.
**Action:** Always use incremental aggregation (update min/max in the loop) or `reduce` instead of spreading arrays for large datasets. This also saves memory by avoiding the storage of the array.
