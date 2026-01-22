# Module: Attendance (Asistencia)

## Description
This module tracks employee work hours, check-ins (entry), and check-outs (exit). It provides a view for the user to manage their own attendance and for admins to review records.

## Capabilities
- **Clock In/Out**: Users register their start/end of day.
- **Break Management**: Register start/end of lunch breaks.
- **History**: View past attendance records (`attendance_logs`).
- **Correction**: Request adjustments if they forgot to clock in (features often linked with `requests` module).

## Key Files
- `page.tsx`: The attendance dashboard/interface.

## Data Dependencies
- **Supabase Tables**:
  - `attendance`: Stores daily records.
  - `attendance_logs`: Granular events (Clock In, Break Start, etc.).
  - `profiles`: Linked employee.

## Agent Context
- **Time Sensitivity**: Accuracy of `timestamp` is critical.
- **Geofencing**: Some implementations might require location data (lat/long) for validity, though typically handled on client side before submission.
