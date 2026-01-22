# Module: Collections (Cobranzas)

## Description
This module focuses on tracking and managing pending payments (Invoices/Vouchers) from completed Sales. It provides tools for the "Cobranzas" or "Accounting" departments.

## Capabilities
- **Pending Payment Tracking**: Filters sales that are in `firmado` status (delivered/signed) but might not be fully paid.
  - Though `collections` logic often intersects with `sales`, this view likely focuses purely on money in/out.
- **Voucher Verification**:
  - Review uploaded vouchers (Comprobantes).
  - Confirm validity with Accounting (`accounting_confirmed`).
- **Data Filtering**:
  - Filter by Client (Entity).
  - Filter by Date ranges.

## Key Files
- `page.tsx`: Main dashboard for Collections. Lists sales/invoices and their payment status.

## Data Dependencies
- **Supabase Tables**:
  - `sales` / `sales_with_items`: Source of payable entries.
  - `payment_vouchers`: The payment proofs.
  - `entities`: Clients.

## Agent Context
- **Role Specific**: Typically restricted to `Contabilidad`, `Administración`, `Cobranzas`.
- **Integration**: Confirming a voucher here updates the sale's payment status, often triggering a transition to `paid` or similar in the background (check logic in `handleConfirmVoucher`).
