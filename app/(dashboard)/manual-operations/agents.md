# Module: Manual Operations (Operaciones Manuales)

## Description
This module allows administrators and supervisors to log operations that occurred outside the digital system (e.g., offline sales, manual inventory adjustments, or corrections). It ensures the system's data reflects reality.

## Capabilities
- **Log Manual Sale**: Record a sale that didn't go through the standard checkout flow.
- **Inventory Adjustment**: Manually add/remove stock (e.g., breakage, gifts).
- **Audit Log**: Keep track of who performed these manual overrides and why.

## Key Files
- `page.tsx`: The form or dashboard for logging these operations.

## Data Dependencies
- **Supabase Tables**:
  - `manual_operations_log` (hypothetical): Logs the action.
  - `sales`: Might insert directly here with a flag `is_manual=true`.
  - `products`: Updates stock.
  - `profiles`: The user performing the action.

## Agent Context
- **Sensitivity**: High. These actions bypass standard validation rules.
- **Permissions**: Restricted to trusted roles (`admin`, `supervisor`).
- **Reasoning**: Always require a "Reason" field for audit purposes.
