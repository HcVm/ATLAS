# Module: Requests (Solicitudes)

## Description
This module manages internal requests (likely for resources, permissions, or administrative actions). It allows users to create new requests and tracks their status through a workflow (pending, approved, rejected).

## Capabilities
- **Request Management**: List and view details of requests made by the user.
- **Workflow**:
  - `new`: Create a new request.
  - `approvals`: Specialized view for Approvers to review requests.
  - `admin`: Administration of request types or flows.
- **Roles**:
  - Requesters: Standard users.
  - Approvers: Users with authority to validate requests.

## Key Files
- `page.tsx`: Main list of requests for the logged-in user.
- `new/page.tsx`: Form to submit a request.
- `approvals/page.tsx`: Queue for pending approvals.

## Data Dependencies
- **Supabase Tables**:
  - `requests`: Core table storing the request data, type, and status.
  - `profiles`: To link requests to requesters.
  - Likely `request_types` or similar for categorization.

## Agent Context
- Check `approvals` subdirectory for logic related to the validation step.
- Status updates (Approve/Reject) likely trigger notifications or state changes in `requests`.
