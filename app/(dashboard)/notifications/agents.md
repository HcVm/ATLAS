# Module: Notifications (Notificaciones)

## Description
This module manages system alerts for the user. It aggregates notifications from all other modules (documents assigned, request approvals, new tasks, etc.).

## Capabilities
- **Inbox**: List of all notifications.
- **Mark as Read**: Dismiss alerts.
- **Filtering**: Unread vs All.
- **Redirection**: Clicking a notification takes the user to the relevant resource (e.g., specific document or task).

## Key Files
- `page.tsx`: The main notifications view.

## Data Dependencies
- **Supabase Tables**:
  - `notifications`: Core table.
  - Linked entities (`documents`, `tasks`, etc.) for context.

## Agent Context
- **Real-time**: Ideally updates live.
- **Importance**: Critical for workflow continuity; if users miss notifications, processes stall.
