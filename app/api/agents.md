# Module: API Routes (Backend Endpoints)

## Description
This directory contains the Next.js API Routes (server-side endpoints). These endpoints handle sensitive operations, complex logic, third-party integrations, and operations that require elevated privileges (Service Role).

## Capabilities
- **Authentication & Admin**:
  - `admin-create-user` / `admin-register`: User management bypassing client-side restrictions.
  - `register`: Public registration flow.
- **Module backends**:
  - `chat`: Message handling, likely real-time setup or webhooks.
  - `calendar` / `check-calendar-notifications`: Event management and alerts.
  - `news`: Publishing and retrieving announcements.
  - `departments`, `users`: CRUD operations for organizations.
- **Data & Reporting**:
  - `open-data`: Huge module for "Peru Compras" / "Acuerdos Marco" analysis (`brand-alerts`, `rankings`, etc.).
  - `generate-quotation-pdf`: Server-side PDF generation using libraries like `puppeteer` or `pdfkit`.
  - `generate-qr`: Dynamic QR code generation.
- **AI & Integrations**:
  - `gemini`: Integration with Google's Gemini AI (likely for content generation or analysis).
  - `maps`: Google Maps or similar geo-services.
  - `webhooks`: Listeners for external events (e.g., payment gateways, external syncs).
- **System**:
  - `diagnostics` / `system-status`: Health checks.
  - `migrate-pending-tasks`: One-off or scheduled maintenance scripts.

## Key Files
- `route.ts`: definitive file in each subdirectory defining `GET`, `POST`, etc.

## Agent Context
- **Security**: These routes often use `supabase-server.ts` or `supabase-admin.ts` to access data with elevated privileges. **NEVER** expose these endpoints publicly without proper session/role checks.
- **Performance**: Heavy tasks (PDF gen, AI) should be handled here, not on the client.
- **Open Data**: The `open-data` folder is complex; if modifying, check `lib/open-data.ts` and `lib/open-data-processing.ts` as they share logic.
