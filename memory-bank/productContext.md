# Product Context

This file provides a high-level overview of the project and the expected product that will be created. Initially it is based upon projectBrief.md (if provided) and all other available project-related information in the working directory. This file is intended to be updated as the project evolves, and should be used to inform all other modes of the project's goals and context.
2025-10-02 04:15:58 - Log of updates made will be appended as footnotes to the end of this file.

## Project Goal

ShearFrac Operations Platform - A comprehensive well rig equipment and job management system for fracking operations. Provides real-time equipment tracking, job diagram visualization, inventory management, and deployment tracking for oilfield operations.

**Production URL:** https://shearfrac-rig-operations.vercel.app

## Key Features

### Equipment Management
- Individual & bulk equipment inventory tracking
- Equipment type management (Y-Adapters, Wellside Gauges, Frack Hose, Swivels, Hammer Unions)
- Red-tagged equipment tracking and maintenance alerts
- Equipment deployment & return workflows
- Location-based equipment tracking
- Equipment usage statistics & history

### Job Management
- Interactive job diagram canvas with React Flow
- Real-time equipment allocation to jobs
- Cable/connection visualization
- Job contacts & crew management
- Job photo uploads & gallery
- Well configuration panels
- Equipment deployment summaries

### Technical Features
- Hybrid database: Turso (production) / Mock (development)
- Offline-first with service worker support
- Real-time sync via Supabase realtime (when configured)
- Knowledge graph integration for decision tracking
- React Query for data fetching & caching
- TypeScript with strict type checking

## Overall Architecture

### Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn/ui + Tailwind CSS + Radix UI
- **State:** React Query + Context API
- **Database:** Turso (LibSQL) with mock fallback
- **Realtime:** Supabase realtime channels
- **Routing:** React Router v6
- **Diagram:** React Flow for job visualization
- **Deployment:** Vercel (auto-deploy from GitHub)

### Code Architecture
- Manager pattern for equipment operations (96 hooks → 12 managers, 87% reduction)
- Unified sync system replacing 4 competing sync hooks
- Transaction-based bulk operations for data consistency
- Lazy module initialization to prevent race conditions
- Equipment CRUD, Search, Usage, Validation managers
- Compatibility wrappers for zero-downtime migrations

### Database Schema
- `equipment_types` - Equipment catalog
- `equipment_items` - Individual equipment inventory
- `bulk_equipment_deployments` - Bulk deployment tracking
- `jobs` - Job records
- `locations` - Equipment locations
- `contacts` - Company contacts
- `job_photos` - Job documentation
- `cable_types` - Connection types for diagrams

### Key Patterns
- Error boundaries for fault tolerance
- Safe wrappers for data providers
- Retry logic with exponential backoff
- Status validation for equipment mutations
- Module-level lazy initialization (no global state at module load)

---

## Recent Major Fixes (2025-10)
- Fixed empty equipment types in production (seed now runs for mock DB)
- Fixed duplicate JSX loading attributes causing build errors
- Fixed Types tab, Usage tab, Contacts page crashes
- Deployed comprehensive testing via complete-test MCP (score: 53/100)
- Initialized Memory Bank for better project documentation   