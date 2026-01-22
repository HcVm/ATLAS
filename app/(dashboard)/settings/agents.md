# Module: Settings (Configuración)

## Description
This module helps users manage their personal preferences and application settings. It also provides system-wide configurations for administrators.

## Capabilities
- **Personal Settings**:
  - **Account**: Update email, password (if applicable, though usually Auth provider handles this).
  - **Profile**: Edit bio, avatar url.
  - **Notifications**: Toggle email/system notifications types.
- **App Settings** (Admin only):
  - **Theme**: Light/Dark/System.
  - **Integrations**: Connect external services (Calendar, etc. if implemented).
  - **Data Management**: Export data, Clear cache.

## Key Files
- `page.tsx`: The settings dashboard. Often tabbed (General, Notifications, Account, etc.).

## Data Dependencies
- **Supabase Tables**:
  - `profiles`: Stores personal settings.
  - `admin_settings` (if exists): System-wide flags.
  - LocalStorage: For theme/UI preferences.

## Agent Context
- **User specific**: Changes here affect only the logged-in user unless they are admin changes.
- **Theme**: Currently handled by `next-themes` often, so this page toggles that context.
