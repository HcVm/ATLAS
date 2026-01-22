# Module: News (Noticias y Comunicados)

## Description
This module functions as the internal communications channel. Administrators can post announcements, company news, and updates that are visible to all employees.

## Capabilities
- **News Feed**: Displays a list of news items with titles, excerpts, and images.
- **Filters**:
  - Filter by category (General, RRHH, IT, Operaciones).
  - Search by keywords.
- **CRUD Operations**:
  - `create`: New announcement form.
  - `edit`: Modify existing news.
  - `view`: Detailed article view.
  - **Pinning**: Important news can be "pinned" to the top.

## Key Files
- `page.tsx`: The feed view.
- `create/page.tsx`: Editor for new posts.
- `view/[id]/page.tsx`: Single post reader.

## Data Dependencies
- **Supabase Tables**:
  - `news`: Stored articles.
  - `profiles`: Authors.
  - `departments`: For category context (optional).

## Agent Context
- **Rich Text**: Content likely involves rich text or at least multi-paragraph structures.
- **Visibility**: Usually public to all authenticated users, but creation is restricted to specific roles (`admin`, `rrhh`).
