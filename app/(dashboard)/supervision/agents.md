# Module: Supervision (Supervisión)

## Description
This module is designed for supervisors and administrators to oversee employee performance, attendance, and tasks. It aggregates data specifically for management purposes.

## Capabilities
- **Employee Monitoring**:
  - View list of supervised employees.
  - Drill down into individual employee performance (`employee/[id]`).
- **Attendance Oversight**:
  - Quick view of late arrivals or absences.
- **Task Oversight**:
  - View tasks assigned to team members and their completion status.

## Key Files
- `page.tsx`: The main dashboard for supervision.
- `employee/[id]/page.tsx`: Individual employee 360 view.

## Data Dependencies
- **Supabase Tables**:
  - `profiles`: Employee data.
  - `attendance_logs`: For time tracking.
  - `tasks`: For work tracking.
  - `employee_requests`: For leave requests.

## Agent Context
- **Role Restricted**: This module should *only* be accessible to `admin` or `supervisor` roles.
- **Data Privacy**: Ensure supervisors only see data for their assigned departments or teams if strict hierarchy is enforced (though currently often company-wide for admins).
