# Module: Dashboard (Inicio)

## Description
This module is the landing page for authenticated users. It provides a personalized overview of the most relevant information and quick actions based on the user's role.

## Capabilities
- **Role-Based Widgets**:
  - **Admin**: System-wide stats (Users, Departments, Recent Activity).
  - **User**: Personal Tasks, Pending Requests, My Tickets.
- **Quick Links**: Shortcuts to frequently used modules (`new request`, `new ticket`, `calendar`).
- **Announcements**: Preview of latest `news`.
- **Photocheck**: Digital ID card display.

## Key Files
- `page.tsx`: The main dashboard grid layout.
- Components: `PhotocheckCard`, `QuickActions`, `RecentActivity`.

## Data Dependencies
- **Supabase Tables**:
  - `profiles`: User info.
  - `tasks`: Upcoming tasks.
  - `news`: Latest announcements.
  - `notifications`: Unread alerts.

## Agent Context
- **First Impression**: This is the first thing users see. Performance and visual appeal are critical.
- **Dynamic Content**: Data here is a summary from other modules. Avoid heavy computations; fetch lightweight summaries.
