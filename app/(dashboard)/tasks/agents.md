# Module: Tasks (Gestión de Tareas)

## Description
This module allows users to manage their daily tasks. It supports creating tasks, assigning them (or self-assignment), setting priorities, and tracking progress through a Kanban-like or list interface.

## Capabilities
- **Task CRUD**: Create, Read, Update, Delete tasks.
- **Organization**:
  - **Priorities**: Low, Medium, High, Critical.
  - **Status**: To Do, In Progress, Done, etc.
- **Context**:
  - Assignable to specific `projects` (tables exist for this?) or related to `sales`/`documents` if implemented involving relations.
- **Views**:
  - List view vs Board (Kanban) view toggles.

## Key Files
- `page.tsx`: Main task management interface. Likely complex state management for drag-and-drop or modal interactions.

## Data Dependencies
- **Supabase Tables**:
  - `tasks`: Core task data.
  - `profiles`: Assignees and creators.
  - `departments`: Filtering by team tasks.

## Agent Context
- **Personal vs Team**: Users might see "My Tasks" vs "Team Tasks".
- **Notifications**: Creating or assigning tasks often triggers notifications handled in `lib/notifications`.
