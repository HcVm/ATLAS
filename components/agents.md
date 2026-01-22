# Module: Frontend Components (UI Library)

## Description
This directory contains the visual building blocks of ATLAS. It follows a Component-Driven Development approach, primarily based on `shadcn/ui` (built on top of Radix UI and Tailwind CSS).

## 1. UI Primitives (`components/ui`)
These are the atomic components. **Do not modify these unless you are fixing a bug or updating the design system globally.**
- **Forms**: `input.tsx`, `select.tsx`, `checkbox.tsx`, `form.tsx` (react-hook-form wrapper).
- **Layout**: `card.tsx`, `sheet.tsx`, `dialog.tsx`, `scroll-area.tsx`.
- **Feedback**: `toast.tsx`, `alert.tsx`, `sonner.tsx`.
- **Navigation**: `sidebar.tsx` (Core App Navigation), `tabs.tsx`, `breadcrumb.tsx`.
- **Data Display**: `table.tsx`, `badge.tsx`, `avatar.tsx`, `chart.tsx` (Recharts wrapper).
- **Specialized Selectors**:
  - `entity-selector.tsx`: Searchable dropdown for companies/entities.
  - `product-selector.tsx` / `internal-product-selector.tsx`: Complex comboboxes for inventory items.

## 2. Feature Components
These components are specific to business modules but reusable across pages.
- **`components/layout`**: Top-level layout structures (`dashboard-sidebar`, etc.).
- **`components/quotations`**, **`components/sales`**: Specialized forms and cards for these flows.
- **`components/open-data`**: Visualization widgets for the transparency module.
- **`components/chat`**: The chat window interface (`ChatWidget`).

## 3. Global Widgets
- **`atlas-assistant.tsx`**: The AI floating assistant available on every screen.
- **`theme-toggle.tsx`**: Dark/Light mode switcher.
- **`role-guard.tsx`**: Wrapper component to hide/show content based on user permissions.

## Agent Context
- **Styling**: All components use **Tailwind CSS**. Avoid inline styles.
- **Responsiveness**: Always ensure components work on mobile (`hidden md:block`, etc.).
- **Icons**: We use `lucide-react`.
- **Client Components**: Most UI components require `"use client"` directive at the top.
