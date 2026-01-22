# ATLAS Platform - Agentic Architecture

## Overview
This file serves as the root index for the **Agentic Documentation** of the ATLAS platform.
The architecture is modular, and every major directory contains an `agents.md` file explaining its purpose, capabilities, and rules.

## Documentation Map

### 1. Frontend (App Router)
- **Dashboard Modules**: `app/(dashboard)/agents.md`
  - *Detailed breakdown of pages like Sales, Warehouse, HR, etc.*
- **UI & Components**: `components/agents.md`
  - *Design system, primitives, and reusable widgets.*

### 2. Backend & Logic
- **API Routes**: `app/api/agents.md`
  - *Server-side endpoints and integrations.*
- **Server Actions**: `app/actions/agents.md`
  - *Direct server mutations.*
- **Core Logic (Lib)**: `lib/agents.md`
  - *Utilities, Providers, Pdf Generators, and Business Logic.*

## General Principles for Agents
1. **Read First**: Before modifying a module, read its `agents.md` file.
2. **Context Matters**: Respect the boundaries of each module. Do not put "Sales" logic in "HR" unless it's a shared utility in `lib`.
3. **Database Integrity**: Always verify `database.types.ts` in `lib/` before writing SQL/Supabase queries.
4. **UI Consistency**: Use existing components from `components/ui` instead of creating new raw HTML elements.

## Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS + Shadcn/UI
- **Icons**: Lucide React
