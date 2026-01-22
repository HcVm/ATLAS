# Module: Quotations (Cotizaciones)

## Description
This module handles the creation, management, and conversion of sales quotations. It is the precursor to the Sales module, feeding confirmed deals into the sales pipeline.

## Capabilities
- **Quotation Management**:
  - **Create**: Generate new price quotes for clients.
  - **Edit**: Modify line items, pricing, or client details.
  - **Duplicate**: Clone existing quotations for speed.
  - **Delete**: Remove stale or error quotes.
- **Conversion to Sale**:
  - One-click action to convert an approved quotation into a formal Sale.
- **Filtering & Search**:
  - Filter by year (2025, 2026), status (`pendiente`, `enviado`, `aprobado`, `rechazado`), and search terms.
- **Export**:
  - Generate PDF versions of quotations for clients.

## Key Files
- `page.tsx`: The primary interface. Like Sales, this is a large file controlling multiple dialogs (New, Edit, PDF Preview) and state.
- `quotation-form.tsx` (likely component): Used for creating/editing.
- `pdf-generator.ts` (lib): Tooling to render the PDF.

## Data Dependencies
- **Supabase Tables**:
  - `quotations` / `quotations_with_items` (View): Core data.
  - `quotation_items`: Line items (products, quantities, prices).
  - `entities`: Clients.
  - `products`: Source of item data for quotes.

## Agent Context
- **Fiscal Year Scoping**: Like Sales, quotations are often filtered by fiscal year (`selectedYear` state).
- **Permissions**: Standard RBAC (`admin`, `supervisor`, Sales/Ops departments).
- **Integrity**: Deleting a quotation that has already been converted to a Sale might be restricted or require caution (check logic in `handleDelete`).
