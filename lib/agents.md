# Module: Library / Utilities (Business Logic Layer)

## Description
This directory contains the core business logic, shared utilities, context providers, and service layer functions. This is the "brain" of the backend logic, often called by both API routes and frontend components.

## Categories & Capabilities

### 1. Data Contexts & Providers
- **Auth**: `auth-context.tsx` (User session state).
- **Company**: `company-context.tsx`, `company-info.ts` (Selected workspace state).
- **Chat**: `chat-context.tsx` (Real-time messaging logic).

### 2. PDF & Document Generation
This is a critical capability of ATLAS.
- **Generators**: `pdf-generator.ts` (Generic), `cci-letter-generator.ts` (Banking), `presentation-letter-generator.ts` (Sales), `warranty-letter-generator.ts`.
- **Entity Specific**: `pdf-generator-entity.ts` (and variants like `-galur`, `-arm` for specific business units).
- **Reports**: `product-report-generator.ts`, `internal-product-report-generator.ts`.

### 3. Open Data & Analysis
Logic for the "Open Data" module.
- `open-data.ts`, `open-data-processing.ts`: Parsing and analyzing government datasets.
- `brand-alerts-pdf-generator.ts`: Generating reports from analysis.

### 4. Utilities & Helpers
- **Database**: `database.types.ts` (Supabase TypeScript definitions - CRITICAL for type safety), `supabase.ts` (Client), `supabase-server.ts` (Server Client), `supabase-admin.ts` (Admin Client).
- **Formatters**: `date-utils.ts`, `image-utils.ts`, `utils.ts`.
- **Integrations**: `google-maps-utils.ts` (Geocoding/Maps).
- **Exporting**: `export-utils.ts`, `export-utils-advanced.ts` (Excel/CSV handlers).

### 5. Services
- `notifications.ts`: Logic for sending/managing system alerts.
- `sticker-print-service.ts`: Label printing logic.

## Agent Context
- **Type Safety**: ALWAYS consult `database.types.ts` when writing Supabase queries.
- **Supabase Clients**:
  - Use `supabase.ts` for CLIENT-SIDE (Component) logic.
  - Use `supabase-server.ts` for SERVER-SIDE (API Routes, Server Components) logic.
  - Use `supabase-admin.ts` ONLY for administrative tasks (User creation, specific overrides) in `app/api`.
- **Reusability**: Before writing new logic, check if a generator or utility here already exists.
