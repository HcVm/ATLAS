# Module: Warehouse

## Description
This module manages the physical inventory, products, and movements of the supply chain. It provides tools for tracking stock levels, product costs, and traceability (lots/serials).

## Capabilities
- **Warehouse Dashboard**:
  - High-level KPIs: Total products, inventory value, low stock/out of stock alerts.
  - Visual summaries: Top products by stock, recent movement history.
- **Product Management**:
  - CRUD operations for products via `/warehouse/products`.
  - Supports categories, brands, and alert thresholds (minimum stock).
- **Inventory Control**:
  - Tracking of `inventory_movements` (Entry/Exit).
  - Lot and Serial number tracking (`/warehouse/lots-serials`).
  - Barcode label generation (`/warehouse/etiquetado`).

## Key Files
- `page.tsx`: Dashboard aggregation. Fetches data from `products` and `inventory_movements`.
- `products/page.tsx`: Listing and filtering of products.
- `inventory/page.tsx`: Detailed view of stock levels and adjustments.

## Data Dependencies
- **Supabase Tables**:
  - `products`: Core product definition (cost, price, stock levels).
  - `inventory_movements`: Ledger of all stock changes.
  - `brands`, `product_categories`: Categorization.
  - `companies`: Multi-tenant data isolation.

## Agent Context
- **Strict Role Access**: Confined to specific departments (Almacén, Contabilidad, etc.) or Admin/Supervisor roles.
- **Transactional Integrity**: Movements calculate stock adjustments. Never adjust `current_stock` directly without logging a corresponding `inventory_movement` record to ensure traceability.
- **Multi-tenancy**: Always filter by `company_id`.
