# Module: Calendar (Calendario)

## Description
This module provides a visual schedule of company events, milestones, and deadlines. It integrates with other modules like Tasks and Requests to show a unified timeline.

## Capabilities
- **Views**:
  - Month view, Week view, Day view (likely using a library like `react-big-calendar` or similar).
- **Event Sources**:
  - **Manual Events**: Users can create specific items.
  - **Integrated Events**: Shows `tasks` due dates, `requests` (e.g. absent days), etc.
- **Filters**:
  - Filter by event type (Meeting, Deadline, Personal, Company).
- **Interactions**:
  - Click to view details.
  - Drag and drop to reschedule (if supported).

## Key Files
- `page.tsx`: The main calendar component wrapper.

## Data Dependencies
- **Supabase Tables**:
  - `calendar_events` (if exists, or derived from other tables).
  - `tasks`: Due dates.
  - `employee_requests`: Approved leaves/vacations.

## Agent Context
- **Read-Only vs Write**: Most reliable data comes from other modules (`tasks`, `requests`). Manual calendar entries might be stored in a dedicated table.
- **Timezones**: Critical. Ensure distinct handling of UTC vs Local time (Peru Time).
