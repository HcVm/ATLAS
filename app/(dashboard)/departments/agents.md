# Module: Departments (Departamentos)

## Description
This module is for managing the organizational structure. It maintains the list of departments that group users and documents.

## Capabilities
- **CRUD**: Create, Read, Update, Delete departments.
- **Key Attributes**:
  - `name`: Display name.
  - `color`: For UI tags.
  - `company_id`: Multi-tenant filtered.
- **Stats**: View number of users or documents per department (if implemented).

## Key Files
- `page.tsx`: List of departments.
- `new/page.tsx`: Create form.
- `edit/[id]/page.tsx`: Edit form.

## Data Dependencies
- **Supabase Tables**:
  - `departments`: Core table.
  - `profiles`: to count members?
  - `companies`: Hierarchy parent.

## Agent Context
- **Admin Only**: Usually restricted to `admin` role.
- **Color Coding**: Departments often have hex codes associated for visual distinction in other modules (`movements`, `documents`).
