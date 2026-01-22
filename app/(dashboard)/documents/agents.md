# Module: Documents (Gestión Documental)

## Description
This module is the central repository for official document management (Sistradoc / Tramite Documentario). It handles the registration, movement, tracking, and archival of internal and external documents.

## Capabilities
- **Document Registry**:
  - **Inbound/Outbound**: Track documents entering or leaving the organization.
  - **Types**: Memos, official letters (Oficios), reports, etc.
  - **Digital Copies**: Upload PDF attachments (stored in Supabase Storage buckets).
- **Tracking (Traza)**:
  - **Movements**: Documents are "moved" between users/departments. This tracks chain of custody.
  - `document_movements` table is key here.
- **Workflow**:
  - `new`: Register a new document.
  - `edit`: Modify meta-data.
  - **Reception/Derivation**: Users can "receive" documents sent to them and "derive" (forward) them to others.

## Key Files
- `page.tsx`: The main inbox/outbox view.
- `new/page.tsx`: Form for registering new documents.
- `[id]/page.tsx`: Detailed view showing the document's history and movement log.

## Data Dependencies
- **Supabase Tables**:
  - `documents`: Core metadata (sender, subject, type, etc.).
  - `document_movements`: The ledger of where the document is and who has it.
  - `profiles`/`departments`: For routing logic.

## Agent Context
- **Role-based View**: Users usually only see documents currently in their "possession" (assigned to them via the latest movement) or documents they created.
- **Movements are Immutable**: Generally, once a movement is accepted/processed, it becomes historical record.
- **File Storage**: Ensure any uploaded files are handled via the `document-attachments` bucket (or similar).
