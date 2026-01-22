# Module: Dashboard Layout (Global)

## Description
This is the root layout for the authenticated area of the application. It wraps all dashboard modules with common UI elements like the Sidebar, Topbar, and Authentication checks.

## Capabilities
- **Authentication Protection**: Redirects unauthenticated users to `/login`.
- **Global Contexts**:
  - `CompanyProvider`: Manages selected company state.
  - `ChatProvider`: Initializes real-time chat.
  - `SidebarProvider`: Manages sidebar collapse state.
- **UI Structure**:
  - `DashboardSidebar`: Main navigation.
  - `DashboardHeader`: Top bar with user menu, notifications, etc.
  - `Main Content Area`: Where page content renders.

## Key Files
- `layout.tsx`: Server component that checks auth.
- `dashboard-layout-client.tsx`: Client component managing state and UI structure.

## Agent Context
- **Global Scope**: Changes here affect EVERY page in the dashboard.
- **State Management**: Ideally, global state (like "current company") is lifted here or in the providers it wraps.
