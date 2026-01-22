# Module: Users

## Description
This module handles the management of system users. It ensures that Administrators and Support staff can view, filter, edit, and manage user accounts securely.

## Capabilities
- **Listing**: Displays a paginated/filtered list of users from the `profiles` table.
- **Filtering**: Supports search by name, email, department, and company.
- **Role Management**: Visual distinction and logic for `admin`, `supervisor`, `user`, and `support` roles.
- **Actions**:
  - **Edit**: specific route `edit/[id]` to modify user details.
  - **Delete**: Includes safety checks preventing deletion if users have associated `documents` or `document_movements`.
  - **Password Reset**: Admin tool to force-reset user passwords via `resetUserPassword` action.

## Key Files
- `page.tsx`: Main dashboard for user management. Handles data fetching, local state (view mode, search), and interactions.
- `edit/[id]/page.tsx`: Form for editing specific user details.

## Data Dependencies
- **Supabase Tables**: 
  - `profiles` (Main data)
  - `departments` (Relation)
  - `companies` (Relation)
  - `documents` (Integrity check)
  - `document_movements` (Integrity check)

## Agent Context
When working on this module, be aware of the `useAuth` and `useCompany` contexts which drive the data visibility. Deletions are destructive and guarded by integrity checks; do not bypass them.
