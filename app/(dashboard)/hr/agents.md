# Module: Human Resources (HR)

## Description
This module is the central hub for managing the organization's workforce. It aggregates data from personnel, attendance, and recruitment into a dashboard and provides entry points to specific management sub-modules.

## Capabilities
- **HR Dashboard**: 
  - Visual summary of active employees, daily attendance (present/late), and recent document uploads.
  - Interactive charts (Recharts) for attendance trends.
- **Sub-Modules**:
  - `personnel`: Detailed employee directory and profile management.
  - `attendance`: Daily attendance logging and reporting.
  - `recruitment`: ATS (Applicant Tracking System) features—jobs, candidates, interviews.

## Key Files
- `page.tsx`: The dashboard view. Aggregates data from multiple tables (`profiles`, `attendance`, `hr_documents`).
- `recruitment/`: Contains logic for job postings and candidate processing.
- `personnel/`: Employee list and individual file management.

## Data Dependencies
- **Supabase Tables**:
  - `profiles`: Employee count and details.
  - `attendance`: Daily records for stats (active, late).
  - `hr_documents`: Recent file uploads.
  - *Recruitment specific*: `jobs`, `candidates`, `interviews`.

## Agent Context
- The dashboard is **read-only** analytics; actions are taken in sub-modules.
- When modifying the dashboard, ensure you respect the `useAuth` or company context if data needs to be siloed (currently mostly aggregations).
- Date handling is critical here (timezones for attendance); use `date-fns` as established in `page.tsx`.
