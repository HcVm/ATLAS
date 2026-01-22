# Module: Statistics (Estadísticas)

## Description
This module provides high-level business intelligence and visualization of the company's performance. It aggregates data from various modules (Sales, Quotations, HR, etc.) to present actionable insights.

## Capabilities
- **Sales Analysis**:
  - Monthly sales trends (Bar/Line charts).
  - Comparison against targets (Quota attainment).
- **Quotation Funnel**:
  - Conversion rates (Draft -> Review -> Approved -> Sale).
- **Time/Year Filtering**:
  - View data by Fiscal Year (`2024`, `2025`, `2026`).
- **Entity/Leaderboards**:
  - Top Clients.
  - Top Selling Products.

## Key Files
- `page.tsx`: Main analytics dashboard. Uses charting libraries (likely `recharts`) to render visual data.

## Data Dependencies
- **Supabase Tables**:
  - `sales` / `sales_with_items`: Confirmed revenue.
  - `quotations`: Pipeline potential.
  - `quotation_items`: Product breakdown.
- **Aggregations**:
  - Most logic here is read-only aggregation (SUM, COUNT, AVG) filtered by date ranges.

## Agent Context
- **Heavy Read Load**: This page performs multiple heavy queries to aggregate stats.
- **Accuracy**: Dependent on the status correctness of Sales and Quotations modules.
- **Confidentiality**: Access is likely restricted to Management (`Admin`, `Supervisor`, `Jefatura`).
