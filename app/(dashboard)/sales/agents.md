# Module: Sales (Gestión de Ventas)

## Description
This module is responsible for the entire sales lifecycle, from quotation tracking to final delivery and invoicing. It includes CRM features, Kanban boards for deal flow, and detailed sales record management.

## Capabilities
- **Sales List & Filtering**:
  - View all sales filtered by date (year), company, and user permissions.
  - Search by client, RUC, quotation code.
  - Status management: `comprometido`, `devengado`, `girado`, `firmado`, `rechazada`.
- **Transaction Management**:
  - **Create**: Supports both single-product and multi-product sales (`MultiProductSaleForm`).
  - **Edit**: Edit existing sales details (`SaleEditForm`, `MultiProductSaleEditForm`).
  - **Documents**: Generate Warranty Letters (`Carta Garantía`) and CCI Letters automatically.
  - **Vouchers**: Upload and verify payment vouchers (`PaymentVoucherDialog`).
- **Sub-Modules**:
  - `crm`: Customer Relationship Management view (likely detailed entity/contact management).
  - `kanban`: Visual pipeline board for managing sales stages.
- **Entity Management**:
  - Manage client entities via `SalesEntityManagementDialog`.

## Key Files
- `page.tsx`: The main controller. Massive file handling state for dialogs (New, Edit, Status, Voucher, Letters), data fetching, and permissions.
- `kanban/page.tsx`: Visual board for sales pipeline.
- `crm/page.tsx`: Relationship management dashboard.

## Data Dependencies
- **Supabase Tables**:
  - `sales` / `sales_with_items` (View): Core sales data.
  - `sale_items`: Line items for each sale.
  - `payment_vouchers`: Proof of payment attachments.
  - `entities`: Customers/Clients.

## Agent Context
- **Complex State**: `page.tsx` has many dialogs managed by local state variables (`showNewSaleDialog`, `showEditDialog`, etc.). Be careful when refactoring not to break the open/close logic.
- **Permissions**: Heavily guarded by role checks (`admin`, `supervisor`) and specific department names (e.g., "Acuerdos Marco").
- **Fiscal Years**: Note the `selectedYear` state; operations usually scoped to a fiscal year.
