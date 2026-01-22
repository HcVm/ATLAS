# Module: Movements (Movimientos Documentarios)

## Description
This module is the audit trail for document flow. It tracks every time a document moves from one status or department to another.

## Capabilities
- **Timeline View**: Shows the history of a document's journey.
- **Filtering**:
  - By Department (Source/Destination).
  - By Date.
  - By Document ID.
- **Details**:
  - Who moved it (`profiles`).
  - When (`created_at`).
  - Notes/Comments attached to the movement.

## Key Files
- `page.tsx`: The main movements log view.

## Data Dependencies
- **Supabase Tables**:
  - `document_movements`: The core log table.
  - `documents`: Linked document details.
  - `departments`: Source/Target info.
  - `profiles`: User info.

## Agent Context
- **Read-Heavy**: This module is primarily for viewing and auditing history, not creating new data (movements are created mostly automatically via `documents` actions).
- **Compliance**: Critical for tracking bottlenecks or understanding where a document got stuck.
