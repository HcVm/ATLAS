# Module: Profile (Perfil de Usuario)

## Description
This module allows users to view and edit their public profile information. It is separate from "Settings" which handles account configuration; this is about identity and professional details.

## Capabilities
- **View Profile**: See own details (Name, Role, Department, Contact Info).
- **Edit Profile**: Update `full_name`, `avatar_url`, phone number, etc.
- **Activity Log**: Often displays recent actions (logins, updates) if implemented.

## Key Files
- `page.tsx`: The profile view and edit form.

## Data Dependencies
- **Supabase Tables**:
  - `profiles`: The main source of truth.
  - `buckets` (`avatars`): For profile picture storage.

## Agent Context
- **Sync**: Updates here should reflect across the app immediately (e.g. via `auth-context` or real-time subscription).
- **Permissions**: Users can only edit *their own* profile. Admins *might* be able to edit others via `admin/users` (different module).
