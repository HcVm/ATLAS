# Module: Documentation (Manual de Usuario / Documentación)

## Description
This module serves as the central Help Center or Wiki for the ATLAS platform. It contains guides, tutorials, and standard operating procedures (SOPs) for using the various modules.

## Capabilities
- **Navigation**: Organized by module (Sales, HR, Warehouse, etc.).
- **Content**: Static or dynamic markdown/content pages explaining functionalities.

## Key Files
- `page.tsx`: Index of documentation sections.
- Subdirectories (`attendance`, `sales`, etc.): Specific guides for those modules.

## Data Dependencies
- **Static Content**: Mostly hardcoded content or markdown files.
- **Dynamic Content** (optional): Could load from a CMS or `news` table if "Latest Updates" are shown.

## Agent Context
- **Reference**: Use this material to understand *how* the user expects the system to work if you are unsure.
- **Maintenance**: When features change, this documentation should theoretically be updated (though users often forget).
