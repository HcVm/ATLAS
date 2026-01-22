# Module: Support (Soporte Técnico)

## Description
This module serves as the Help Desk or Ticket System. Users can report technical issues, and IT support staff can manage these tickets.

## Capabilities
- **Ticket Management**:
  - **Create**: Report issues (`new`).
  - **View**: List my tickets (users) or all tickets (IT support).
  - **Status Flow**: `open` -> `in_progress` -> `resolved` / `closed`.
- **Communication**:
  - Comments or messaging within the ticket detail view (`[id]`).
- **Knowledge Base**:
  - Potentially links to FAQs or documentation (if integrated).

## Key Files
- `page.tsx`: List of support tickets.
- `new/page.tsx`: Ticket creation form.
- `[id]/page.tsx`: Ticket conversation and details.

## Data Dependencies
- **Supabase Tables**:
  - `support_tickets`: Core issue data.
  - `ticket_comments` (or similar): Threaded discussion.
  - `profiles`: Creator and Assignee.

## Agent Context
- **Role Specific**:
  - Regular users: See own tickets.
  - IT Department/Admins: See all tickets and manage status/assignment.
- **Priority**: Tickets likely have priority levels (Low, Medium, High, Critical).
