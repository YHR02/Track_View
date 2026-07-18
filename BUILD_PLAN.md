# 🚀 Track Wise — Enterprise Architecture & Implementation Plan

> **Author:** Staff Software Engineer / Software Architect Review  
> **Status:** v2.0 — Complete Architectural Overhaul  
> **Date:** July 18, 2026

---

## Table of Contents

1. [Architecture Review](#1-architecture-review)
2. [Final Architecture](#2-final-architecture)
3. [Folder Structure](#3-folder-structure)
4. [Google Sheet Design](#4-google-sheet-design)
5. [Repository Layer](#5-repository-layer)
6. [Service Layer](#6-service-layer)
7. [State Management](#7-state-management)
8. [Complete Build Phases](#8-complete-build-phases)
9. [Risk Analysis](#9-risk-analysis)
10. [Future Enhancements](#10-future-enhancements)
11. [Final Review](#11-final-review)

---

## 1. Architecture Review

### Review of Initial Proposal

The following reviews the initial architecture proposal and identifies key changes based on best practices.

#### ✅ Strengths

| Area | Strength |
|------|----------|
| **Tech Stack** | React + Vite + TypeScript + Tailwind is a modern, fast, well-supported foundation |
| **State Management** | Zustand is lightweight and appropriate for this scale |
| **GSheet as DB** | Clever zero-infrastructure approach — user owns their data |
| **Phased Delivery** | Four incremental phases reduce risk and allow early feedback |
| **Reusable Components** | UI component library promotes consistency |
| **Design System** | Defined colors, typography, and spacing creates a cohesive visual language |
| **Optimistic UI** | Intended approach of instant feedback is correct for UX |

#### ❌ Weaknesses

| Area | Weakness | Impact |
|------|----------|--------|
| **Direct Browser OAuth** | Exposing OAuth client credentials in browser source code is a security risk. Anyone can inspect the page and extract the Client ID | **Security** |
| **No data layer abstraction** | UI components communicating directly with Google Sheets API creates tight coupling. Replacing GSheet with any other backend would require rewriting every component | **Maintainability** |
| **4-sheet design** | Over-normalized for a personal tracking app. Categories as a separate sheet adds complexity without proportional benefit | **Simplicity** |
| **Missing sync layer** | No request queue, batch strategy, or retry logic for GSheet API rate limits (60 req/min per user) | **Reliability** |
| **Missing offline strategy** | No defined behavior when the user is offline or the API is unavailable | **UX** |
| **Missing error taxonomy** | All errors treated the same — no differentiated handling for auth vs rate-limit vs network failure | **Robustness** |
| **No loading states** | Skeleton loading mentioned but not integrated into the architecture | **UX** |
| **No testing strategy** | No mention of unit tests, integration tests, or how to test the repository layer | **Quality** |
| **Missing data validation** | No schema validation on read/write — malformed sheet data would crash the app silently | **Reliability** |
| **Single user assumption** | Architecture assumes one user, one sheet — no isolation model if multi-user is needed later | **Scalability** |

#### 🔑 Critical Improvements

1. **Replace direct OAuth with Google Apps Script middleware** — eliminates credential exposure, simplifies frontend auth, and adds a server-side validation layer
2. **Introduce Repository + Service layers** — decouples data access from UI, enables testability, and allows future backend swaps
3. **Reduce to 2 sheets (Trackers + Logs)** — simpler data model, fewer API calls, easier to maintain
4. **Add React Query** — handles caching, optimistic updates, background refetching, and retry logic out of the box
5. **Implement Request Queue** — prevents hitting rate limits during rapid toggling
6. **Add Zod schema validation** — validates data at every boundary (API → Service → Repository → UI)

---

## 2. Final Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React SPA)                          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    PRESENTATION LAYER                         │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌─────────┐  │  │
│  │  │ Pages    │  │ Components   │  │ Layouts  │  │ Hooks   │  │  │
│  │  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └────┬────┘  │  │
│  └───────┼───────────────┼────────────────┼──────────────┼───────┘  │
│          │               │                │              │          │
│  ┌───────┴───────────────┴────────────────┴──────────────┴───────┐  │
│  │                    STATE LAYER                                 │  │
│  │  ┌─────────────────────────────┐  ┌────────────────────────┐  │  │
│  │  │  React Query (Server State) │  │  Zustand (UI State)    │  │  │
│  │  │  • Caching                  │  │  • Theme               │  │  │
│  │  │  • Optimistic Updates       │  │  • Active filters      │  │  │
│  │  │  • Background Refetch       │  │  • Toast queue         │  │  │
│  │  │  • Retry + Error Handling   │  │  • Sidebar state       │  │  │
│  │  └─────────────┬───────────────┘  └────────────────────────┘  │  │
│  └────────────────┼──────────────────────────────────────────────┘  │
│                   │                                                 │
│  ┌────────────────┴──────────────────────────────────────────────┐  │
│  │                   SERVICE LAYER                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐  │  │
│  │  │ Tracker      │  │ Log          │  │ Sync Queue        │  │  │
│  │  │ Service      │  │ Service      │  │ • Debounce        │  │  │
│  │  │              │  │              │  │ • Batch           │  │  │
│  │  │              │  │              │  │ • Retry           │  │  │
│  │  └──────┬───────┘  └──────┬───────┘  │ • Exponential     │  │  │
│  └─────────┼──────────────────┼──────────┼─── Backoff ───────┘  │  │
│            │                  │          │                       │  │
│  ┌─────────┴──────────────────┴──────────┴───────────────────┐  │  │
│  │                  REPOSITORY LAYER                          │  │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  TrackerRepository                                   │  │  │
│  │  │  LogRepository                                       │  │  │
│  │  │  • Abstract data access                              │  │  │
│  │  │  • Interface-driven (swap GSheet ↔ PostgreSQL later) │  │  │
│  │  │  • Zod validation on all data                        │  │  │
│  │  └──────────────────────┬───────────────────────────────┘  │  │
│  └─────────────────────────┼──────────────────────────────────┘  │
│                            │                                      │
│  ┌─────────────────────────┴──────────────────────────────────┐  │
│  │                  API CLIENT LAYER                           │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  AppsScriptClient                                    │  │  │
│  │  │  • fetch() to Apps Script Web App URL                │  │  │
│  │  │  • JSON request/response                             │  │  │
│  │  │  • Token passed via Authorization header             │  │  │
│  │  └──────────────────────┬───────────────────────────────┘  │  │
│  └─────────────────────────┼──────────────────────────────────┘  │
└────────────────────────────┼──────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────┴──────────────────────────────────────┐
│                  GOOGLE APPS SCRIPT (Middleware)                   │
│                                                                   │
│  Acts as a secure proxy between the browser and Google Sheets.    │
│  Runs as the script owner — credentials stay on Google's servers. │
│                                                                   │
│  Endpoints:                                                        │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  POST /api/trackers/list                                     │ │
│  │  POST /api/trackers/create                                   │ │
│  │  POST /api/trackers/update                                   │ │
│  │  POST /api/trackers/reorder                                  │ │
│  │  POST /api/logs/getToday                                     │ │
│  │  POST /api/logs/upsert                                       │ │
│  │  POST /api/logs/getRange                                     │ │
│  │  POST /api/logs/getMonth                                     │ │
│  │  POST /api/sheet/validate                                    │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Executes as: Me (script owner)                                   │
│  Access: Only authorized users (via Google ID token verification) │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┴──────────────────────────────────────┐
│                      GOOGLE SHEET (Single File)                   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Tab 1: Trackers                                            │  │
│  │  Tab 2: Logs                                                │  │
│  │  Tab 3: Metadata (internal app config, versioning)          │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Why Google Apps Script?

| Factor | Direct Browser OAuth | Apps Script Middleware |
|--------|---------------------|----------------------|
| **Credential Exposure** | ❌ Client ID visible in source | ✅ Credentials stay on Google's servers |
| **Rate Limits** | 60 req/min per user | 300 req/min per project (shared across all users) |
| **Data Validation** | ❌ Must be done client-side only | ✅ Server-side validation before sheet write |
| **Future Migration** | Hard — tied to GSheet | Easy — swap Apps Script for another backend |
| **Simple Auth** | OAuth popup + token management | Google ID token verification |
| **Offline Support** | Token refresh complexity | Simpler — Apps Script can cache |

### Architectural Principles

1. **Layered Architecture** — Each layer has a single responsibility and communicates only with the layer directly below it
2. **Dependency Inversion** — High-level modules (services) depend on abstractions (repository interfaces), not concrete implementations
3. **Repository Pattern** — Data access is abstracted behind interfaces. Swapping GSheet for PostgreSQL means writing a new repository implementation — nothing else changes
4. **Optimistic UI** — UI updates instantly, server sync happens in the background. React Query manages rollback on failure
5. **Offline-First** — The sync queue persists pending operations and replays them when connectivity returns
6. **Defensive Design** — Every data boundary validates with Zod schemas. Malformed data never reaches the UI

---

## 3. Folder Structure

```
track-wise/
│
├── public/
│   ├── favicon.svg
│   └── manifest.json
│
├── src/
│   │
│   ├── main.tsx                        # Application entry point
│   ├── App.tsx                         # Root component with router setup
│   ├── index.css                       # Tailwind directives + global styles
│   │
│   ├── types/                          # Shared TypeScript types & Zod schemas
│   │   ├── index.ts                    # Re-export all types
│   │   ├── tracker.ts                  # Tracker type + Zod schema
│   │   ├── log.ts                      # Log type + Zod schema
│   │   ├── api.ts                      # API request/response types
│   │   └── common.ts                   # Shared enums, constants, utility types
│   │
│   ├── config/                         # Application configuration
│   │   ├── index.ts                    # Environment variables, constants
│   │   └── sheets.ts                   # Sheet/tab names, column mappings
│   │
│   ├── lib/                            # Pure utilities (zero dependencies)
│   │   ├── date.ts                     # Date formatting with date-fns
│   │   ├── id.ts                       # ID generation (nanoid or crypto.randomUUID)
│   │   ├── constants.ts               # App-wide constants
│   │   └── validators.ts              # Shared validation helpers
│   │
│   ├── services/                       # Service layer — business logic
│   │   ├── tracker.service.ts          # Tracker business operations
│   │   ├── log.service.ts              # Log business operations (upsert logic)
│   │   ├── sync.service.ts             # Sync queue, debounce, batch, retry
│   │   └── auth.service.ts             # Auth flow (Google Identity Services)
│   │
│   ├── repositories/                   # Repository layer — data access
│   │   ├── interfaces/                 # Abstract repository interfaces
│   │   │   ├── i-tracker.repository.ts
│   │   │   └── i-log.repository.ts
│   │   ├── gsheet/                     # Google Sheets implementation
│   │   │   ├── tracker.repository.ts   # Tracker CRUD via Apps Script
│   │   │   ├── log.repository.ts       # Log CRUD via Apps Script
│   │   │   └── mapper.ts               # Sheet row ↔ TypeScript object mapping
│   │   └── index.ts                    # Repository factory / DI container
│   │
│   ├── api/                            # API client layer
│   │   ├── client.ts                   # Base HTTP client (fetch wrapper)
│   │   ├── apps-script.client.ts       # Apps Script Web App API client
│   │   └── endpoints.ts                # API endpoint definitions
│   │
│   ├── stores/                         # Zustand stores (UI state only)
│   │   ├── ui.store.ts                 # Theme, sidebar, modals
│   │   ├── toast.store.ts              # Toast notification queue
│   │   └── settings.store.ts           # User preferences
│   │
│   ├── hooks/                          # React hooks
│   │   ├── use-trackers.ts             # React Query wrapper for trackers
│   │   ├── use-logs.ts                 # React Query wrapper for logs
│   │   ├── use-auth.ts                 # Auth hook
│   │   ├── use-sync.ts                 # Sync status indicator
│   │   └── use-media-query.ts          # Responsive breakpoints
│   │
│   ├── components/                     # UI Components
│   │   ├── ui/                         # Generic/primitive UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   ├── Stepper.tsx             # Numeric input (+/- buttons)
│   │   │   ├── Skeleton.tsx            # Loading skeleton
│   │   │   ├── Toast.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── IconPicker.tsx
│   │   │
│   │   ├── layout/                     # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── PageContainer.tsx
│   │   │   └── SyncIndicator.tsx       # Shows sync status (syncing/error/ok)
│   │   │
│   │   ├── auth/                       # Authentication components
│   │   │   ├── LoginButton.tsx
│   │   │   ├── AuthGuard.tsx           # Route protection wrapper
│   │   │   └── UserAvatar.tsx
│   │   │
│   │   ├── trackers/                   # Tracker-specific components
│   │   │   ├── TrackerCard.tsx         # Card with checkbox/stepper + icon
│   │   │   ├── TrackerForm.tsx         # Add/edit form in modal
│   │   │   ├── TrackerList.tsx         # Sortable grid of cards
│   │   │   ├── TrackerCardSkeleton.tsx # Loading skeleton for card
│   │   │   └── EmptyState.tsx          # Shown when no trackers exist
│   │   │
│   │   └── dashboard/                  # Dashboard-specific components
│   │       ├── StatCard.tsx
│   │       ├── WeeklyChart.tsx
│   │       ├── StreakDisplay.tsx
│   │       └── CalendarHeatmap.tsx
│   │
│   ├── pages/                          # Route-level page components
│   │   ├── Login.tsx
│   │   ├── Setup.tsx                   # First-time sheet linking
│   │   ├── Dashboard.tsx
│   │   ├── Trackers.tsx
│   │   ├── Calendar.tsx
│   │   ├── Settings.tsx
│   │   └── NotFound.tsx
│   │
│   └── router/                         # Routing configuration
│       ├── index.tsx                   # Route definitions
│       └── routes.ts                   # Route path constants
│
├── apps-script/                        # Google Apps Script project
│   ├── src/
│   │   ├── main.ts                     # doGet() / doPost() entry points
│   │   ├── handlers/
│   │   │   ├── tracker.handler.ts      # Tracker endpoint handlers
│   │   │   ├── log.handler.ts          # Log endpoint handlers
│   │   │   └── sheet.handler.ts        # Sheet validation handlers
│   │   ├── services/                   # Apps Script business logic
│   │   │   ├── tracker.service.ts
│   │   │   └── log.service.ts
│   │   ├── sheets/                     # Sheets API wrapper for Apps Script
│   │   │   ├── client.ts
│   │   │   └── mapper.ts
│   │   ├── auth/                       # ID token verification
│   │   │   └── verify.ts
│   │   └── types.ts
│   ├── appsscript.json                 # Apps Script manifest
│   ├── .clasp.json                     # clasp configuration
│   └── package.json                    # @google/clasp dev dependency
│
├── tests/                              # Test files (mirrors src structure)
│   ├── unit/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── lib/
│   ├── integration/
│   │   └── repositories/
│   └── setup.ts                        # Test configuration
│
├── .env.example                        # Environment variable template
├── .gitignore
├── index.html                          # Vite HTML entry
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

### Why This Structure

| Folder | Purpose |
|--------|---------|
| `types/` | Centralized type definitions prevent type drift across layers. Zod schemas double as runtime validators |
| `config/` | Environment config lives in one place — no magic strings scattered across the codebase |
| `lib/` | Pure functions with zero framework dependencies — easily testable and portable |
| `services/` | Business logic lives here, not in components. Services orchestrate repositories |
| `repositories/` | Abstract data access. The `gsheet/` subfolder is one implementation — swapping it means adding `postgres/` |
| `api/` | HTTP client abstraction — one place to handle headers, errors, and token injection |
| `stores/` | Only UI state (theme, toasts, modals). Server state lives in React Query, never duplicated here |
| `hooks/` | Custom hooks bridge React Query with the service layer. Components never call services directly |
| `components/ui/` | Primitive, reusable, presentation-only components |
| `components/trackers/` | Feature-specific components colocated by domain |
| `pages/` | One file per route — thin, delegates to components and hooks |
| `apps-script/` | Separate project for the Google Apps Script middleware (deployed independently) |
| `tests/` | Mirrors the `src/` structure for easy test discovery |

---

## 4. Google Sheet Design

### Sheet 1: `Trackers`

Defines what appears in the app. Each row is one tracker.

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `trackerId` | `string` (UUID) | ✅ | Unique identifier | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |
| `name` | `string` | ✅ | Display name | `Morning Run` |
| `category` | `string` | ❌ | Optional grouping | `Fitness`, `Health`, `Finance` |
| `type` | `enum` | ✅ | `boolean` / `numeric` / `duration` | `boolean` |
| `active` | `boolean` | ✅ | Whether tracker is shown | `TRUE` |
| `displayOrder` | `number` | ✅ | Sort order (lowest first) | `1` |
| `icon` | `string` | ✅ | Emoji or Lucide icon name | `🏃` |
| `color` | `string` (hex) | ✅ | Theme color | `#22C55E` |
| `target` | `number` | ❌ | Daily target for numeric types | `30` |
| `unit` | `string` | ❌ | Unit label | `minutes`, `pages`, `cups` |
| `frequency` | `enum` | ✅ | `daily` / `weekly` / `weekday` | `daily` |
| `createdAt` | `string` (ISO 8601) | ✅ | Creation timestamp | `2026-07-18T10:00:00Z` |
| `updatedAt` | `string` (ISO 8601) | ✅ | Last modification timestamp | `2026-07-18T10:00:00Z` |

### Sheet 2: `Logs`

Stores daily values. One row per tracker per day (upsert pattern).

| Column | Type | Required | Description | Example |
|--------|------|----------|-------------|---------|
| `date` | `string` (YYYY-MM-DD) | ✅ | Log date | `2026-07-17` |
| `trackerId` | `string` (UUID) | ✅ | References `Trackers.trackerId` | `a1b2c3d4-...` |
| `value` | `string` | ✅ | Stored as string; parsed on read | `true` / `8` / `30:00` |
| `time` | `string` (HH:mm) | ❌ | Time of log entry | `07:30` |
| `note` | `string` | ❌ | Optional note | `Felt great today!` |
| `updatedBy` | `string` (email) | ❌ | Google account email that made the change | `user@gmail.com` |
| `updatedAt` | `string` (ISO 8601) | ✅ | Last modification timestamp | `2026-07-18T10:00:00Z` |

**Composite Primary Key:** `(date, trackerId)` — ensures one record per tracker per day.

### Sheet 3: `Metadata` (Internal — Not User-Facing)

Used exclusively by the Apps Script backend for configuration and versioning. This sheet is automatically created and managed — the user never interacts with it. It is **not** a "primary" sheet; it is a private configuration store.

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `key` | `string` | Config key | `schemaVersion` |
| `value` | `string` | Config value | `2` |

### Value Type Serialization

| Tracker Type | Stored in Sheet | Parsed in App |
|-------------|----------------|---------------|
| `boolean` | `"true"` / `"false"` | `boolean` |
| `numeric` | `"42"` | `number` |
| `duration` | `"30:00"` (MM:ss) | `{ minutes: 30, seconds: 0 }` |

### Why Only 2 Primary Sheets?

1. **Minimum API calls** — Every sheet read counts against rate limits. Fewer sheets = fewer reads
2. **Simpler upsert** — One log lookup by `(date, trackerId)` in one sheet
3. **Future-proof** — Adding `category` as a column on Trackers (not a separate sheet) avoids joins entirely. Categories can be filter-tags, not relational entities
4. **Human-readable** — A user opening the sheet can immediately understand the data without cross-referencing

---

## 5. Repository Layer

### Purpose

The repository layer **abstracts all data access**. Components and services never know whether data comes from Google Sheets, PostgreSQL, or an in-memory mock. This is the **key enabler** for testability and future backend swaps.

### Interface Definitions

```typescript
// src/repositories/interfaces/i-tracker.repository.ts

interface ITrackerRepository {
  list(): Promise<Tracker[]>;
  getById(trackerId: string): Promise<Tracker | null>;
  create(data: CreateTrackerInput): Promise<Tracker>;
  update(trackerId: string, data: UpdateTrackerInput): Promise<Tracker>;
  // Soft-delete (archive) — hard delete is not exposed
  archive(trackerId: string): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}
```

```typescript
// src/repositories/interfaces/i-log.repository.ts

interface ILogRepository {
  getByDate(date: string): Promise<Log[]>;
  getByDateRange(startDate: string, endDate: string): Promise<Log[]>;
  getByTrackerAndDate(trackerId: string, date: string): Promise<Log | null>;
  upsert(trackerId: string, date: string, value: string, note?: string): Promise<Log>;
  getMonth(year: number, month: number): Promise<Log[]>;
}
```

### Responsibilities

| Method | Responsibility |
|--------|---------------|
| `list()` | Fetch all active trackers, sorted by `displayOrder` |
| `create()` | Validate input via Zod, generate UUID, set timestamps, append to sheet, return created tracker |
| `update()` | Validate input, find row by `trackerId`, update cells, return updated tracker |
| `upsert()` | Check for existing `(date, trackerId)` pair. If exists → update row. If not → append new row |
| `getMonth()` | Fetch all logs for a given month — used by Calendar view |

### GSheet Implementation Pattern

```typescript
// src/repositories/gsheet/tracker.repository.ts

export class GSheetTrackerRepository implements ITrackerRepository {
  private readonly client: AppsScriptClient;

  constructor(client: AppsScriptClient) {
    this.client = client;
  }

  async list(): Promise<Tracker[]> {
    const response = await this.client.post('/trackers/list');
    const parsed = trackerSchema.array().parse(response.data);  // Zod validation
    return parsed.filter(t => t.active).sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async create(data: CreateTrackerInput): Promise<Tracker> {
    const validated = createTrackerSchema.parse(data);  // Validate input
    const response = await this.client.post('/trackers/create', validated);
    return trackerSchema.parse(response.data);  // Validate output
  }

  // ... other methods
}
```

### Why This Pattern Matters

> **If tomorrow the team decides to migrate from Google Sheets to PostgreSQL:**
> 1. Create `repositories/postgres/tracker.repository.ts` implementing `ITrackerRepository`
> 2. Swap the repository binding in `repositories/index.ts`
> 3. **Zero changes** to services, hooks, or components

---

## 6. Service Layer

### Purpose

Services contain **business logic** — operations that coordinate multiple repositories, enforce rules, and manage cross-cutting concerns.

### Service Definitions

#### `TrackerService`

```typescript
class TrackerService {
  constructor(private repo: ITrackerRepository) {}

  async getAllActive(): Promise<Tracker[]> { /* delegates to repo.list() */ }
  async create(input: CreateTrackerInput): Promise<Tracker> { /* validate + delegate */ }
  async update(id: string, input: UpdateTrackerInput): Promise<Tracker> { /* validate + delegate */ }
  async archive(id: string): Promise<void> { /* repo.archive(id) — sets active=false */ }
  async reorder(orderedIds: string[]): Promise<void> { /* bulk update displayOrder */ }
}
```

#### `LogService`

```typescript
class LogService {
  constructor(private repo: ILogRepository) {}

  async getToday(): Promise<Log[]> { /* repo.getByDate(today) */ }
  async toggle(trackerId: string): Promise<Log> {
    // Boolean: toggle between true → false → true
    const existing = await this.repo.getByTrackerAndDate(trackerId, today);
    const newValue = existing?.value === 'true' ? 'false' : 'true';
    return this.repo.upsert(trackerId, today, newValue);
  }
  async setValue(trackerId: string, value: string): Promise<Log> {
    // Numeric/duration: set exact value
    return this.repo.upsert(trackerId, today, value);
  }
  async getWeek(date: string): Promise<Log[]> { /* calculate week bounds + query */ }
  async getMonth(year: number, month: number): Promise<Log[]> { /* delegate */ }
}
```

#### `SyncService` (Cross-Cutting)

```typescript
class SyncService {
  private queue: PendingOperation[] = [];
  private debounceTimer: number | null = null;
  private storageKey = 'trackwise-sync-queue';

  constructor() {
    // Restore pending operations from IndexedDB on initialization
    // This ensures the queue survives page refresh / tab close
    this.restoreFromStorage();
  }

  private async restoreFromStorage(): Promise<void> {
    try {
      const stored = await indexedDBGet(this.storageKey);
      if (stored) this.queue = stored;
    } catch {
      this.queue = [];  // If storage is unavailable, start fresh
    }
  }

  private async persistToStorage(): Promise<void> {
    await indexedDBSet(this.storageKey, this.queue);
  }

  enqueue(operation: PendingOperation): void {
    this.queue.push(operation);
    this.persistToStorage();  // Persist immediately so the operation survives crashes
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.flush(), 300);  // 300ms debounce
  }

  private async flush(): Promise<void> {
    // Take all queued operations
    const batch = [...this.queue];
    this.queue = [];
    this.persistToStorage();

    try {
      // Batch them into a single Apps Script API call
      await appsScriptClient.post('/logs/batchUpsert', { operations: batch });
      // On success: resolve all promises
    } catch (error) {
      if (isRateLimitError(error)) {
        // On 429: retry with exponential backoff (1s, 2s, 4s, 8s, max 30s)
        this.queue = [...batch, ...this.queue];  // Re-queue failed operations
        this.persistToStorage();
        const delay = Math.min(1000 * 2 ** this.retryCount, 30_000);
        this.retryCount++;
        setTimeout(() => this.flush(), delay);
      } else {
        // On permanent failure: notify toast store, keep in queue for retry
        this.queue = [...batch, ...this.queue];
        this.persistToStorage();
        useToastStore.getState().addToast({
          type: 'error',
          message: 'Sync failed. Will retry automatically.',
        });
      }
    }
  }
}
```

---

## 7. State Management

### Architecture: React Query + Zustand

```
┌─────────────────────────────────────────────────────────────┐
│                      STATE UNIVERSE                          │
│                                                              │
│  ┌─────────────────────────────────┐  ┌──────────────────┐  │
│  │  React Query (Server State)     │  │  Zustand (Client) │  │
│  │                                 │  │                   │  │
│  │  • Trackers list                │  │  • Theme mode     │  │
│  │  • Today's logs                 │  │  • Sidebar open   │  │
│  │  • Monthly logs                 │  │  • Toast queue    │  │
│  │  • Sync status                  │  │  • Active modal   │  │
│  │  • Mutations (optimistic)       │  │  • Sheet ID       │  │
│  │                                 │  │  • Filter state   │  │
│  │  NEVER mirror in Zustand        │  │                   │  │
│  └─────────────────────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### React Query Configuration

```typescript
// hooks/use-trackers.ts

export function useTrackers() {
  return useQuery({
    queryKey: ['trackers'],
    queryFn: () => trackerService.getAllActive(),
    staleTime: 30_000,               // 30s before refetch
    gcTime: 5 * 60_000,              // Keep in cache for 5 min
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

export function useToggleTracker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (trackerId: string) => logService.toggle(trackerId),
    onMutate: async (trackerId) => {
      // 1. Cancel any in-flight refetches
      await queryClient.cancelQueries({ queryKey: ['logs', 'today'] });
      // 2. Snapshot previous state for rollback
      const previous = queryClient.getQueryData(['logs', 'today']);
      // 3. Optimistically update the cache
      queryClient.setQueryData(['logs', 'today'], (old) => /* flip value */);
      return { previous };
    },
    onError: (err, trackerId, context) => {
      // 4. Rollback on failure
      queryClient.setQueryData(['logs', 'today'], context?.previous);
    },
    onSettled: () => {
      // 5. Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['logs', 'today'] });
    },
  });
}
```

### Zustand Store (UI Only)

```typescript
// stores/ui.store.ts

interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  activeModal: string | null;
  // Actions
  toggleTheme: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'light',
  sidebarOpen: false,
  activeModal: null,
  toggleTheme: () => set((s) => ({
    theme: s.theme === 'light' ? 'dark' : 'light',
  })),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));
```

### Data Flow (Toggle Tracker Example)

```
User taps checkbox
    │
    ▼
TrackerCard.tsx
    │  calls toggleMutation.mutate(trackerId)
    ▼
useMutation.onMutate()
    │  1. Cancel inflight queries
    │  2. Snapshot cache
    │  3. Optimistically update cache
    ▼
UI instantly reflects new state (no waiting)
    │
    ▼
mutationFn()
    │  calls logService.toggle(trackerId)
    ▼
LogService.toggle()
    │  determines new value (true ↔ false)
    │  calls logRepository.upsert(...)
    ▼
LogRepository.upsert()
    │  calls appsScriptClient.post('/logs/upsert', data)
    ▼
SyncService.enqueue()
    │  Adds to queue → debounce 300ms → batch flush
    ▼
Apps Script Web App
    │  Validates → reads sheet → checks for existing row
    │  If exists → update row. If not → append row.
    ▼
Response returned → React Query updates cache → UI consistent
```

---

## 8. Complete Build Phases

---

### Phase 0 — Foundation & Infrastructure

**Goal:** Establish the project scaffold, tooling, and development workflow.

**Estimated Complexity:** 🟢 Low

**Dependencies:** None

**Tasks:**

1. Initialize Vite + React + TypeScript project
2. Install core dependencies:
   - `react-router-dom`, `@tanstack/react-query`, `zustand`
   - `tailwindcss`, `clsx`
   - `lucide-react`, `date-fns`
   - `zod` (validation)
   - `@googleapis/sheets` (for Apps Script reference), `gapi-script` (for GIS)
3. Configure Tailwind with design system tokens (colors, spacing, typography)
4. Configure TypeScript strict mode
5. Set up `src/` folder structure (all directories, empty index files)
6. Set up ESLint + Prettier
7. Create `.env.example` with `VITE_GOOGLE_CLIENT_ID`
8. Create `README.md` with setup instructions
9. Verify: `npm run dev` starts without errors
10. Verify: `tsc --noEmit` passes with zero errors

**Acceptance Criteria:**
- [ ] `npm run dev` → blank page loads on localhost
- [ ] `tsc --noEmit` → zero errors
- [ ] Tailwind classes render correctly
- [ ] All directories exist with proper structure

---

### Phase 1 — Google Apps Script Middleware

**Goal:** Build and deploy the Google Apps Script proxy that secures and mediates all sheet access.

**Estimated Complexity:** 🟡 Medium

**Dependencies:** Phase 0

**Tasks:**

1. Create `apps-script/` project directory
2. Install `@google/clasp` globally
3. Create `appsscript.json` manifest
4. Implement Apps Script entry points (`doGet`, `doPost`):
   - Request routing by endpoint path
   - JSON body parsing
   - Response formatting (success + error envelopes)
5. Implement ID token verification (Google OAuth2)
6. Implement sheet validation endpoint (`POST /sheet/validate`):
   - Verify spreadsheet exists and is accessible
   - Verify required tabs exist (Trackers, Logs, Metadata)
   - Create missing tabs if needed
   - Return sheet metadata
7. Implement tracker endpoints:
   - `POST /trackers/list` → read all rows, return as JSON
   - `POST /trackers/create` → validate, append row, return created
   - `POST /trackers/update` → find row by ID, update cells
   - `POST /trackers/reorder` → batch update displayOrder
8. Implement log endpoints:
   - `POST /logs/getToday` → filter by today's date
   - `POST /logs/upsert` → check exists → update or append
   - `POST /logs/getRange` → filter by date range
   - `POST /logs/getMonth` → filter by year + month
9. Implement rate limit safety (Apps Script has its own quotas):
   - Cache frequently accessed data in ScriptProperties
   - Minimize `SpreadsheetApp.flush()` calls
10. Deploy as Web App:
    - Execute as: `Me`
    - Access: `Anyone with link` (ID token verification protects actual data)
11. Document deployment URL for frontend configuration

**Acceptance Criteria:**
- [ ] Apps Script deploys successfully as a Web App
- [ ] `POST /sheet/validate` returns sheet metadata for a valid sheet ID
- [ ] `POST /trackers/list` returns tracker rows as JSON
- [ ] `POST /logs/upsert` creates new row on first call, updates on second call
- [ ] ID token verification rejects unauthenticated requests
- [ ] Response format is consistent: `{ success: true, data: ... }` or `{ success: false, error: ... }`

---

### Phase 2 — Authentication & Sheet Connection

**Goal:** User can log in with Google and connect their sheet.

**Estimated Complexity:** 🟡 Medium

**Dependencies:** Phase 0, Phase 1

**Tasks:**

1. Build `src/lib/auth.ts`:
   - Initialize Google Identity Services
   - `signIn()` — trigger One Tap or popup
   - `signOut()` — disconnect
   - `getIdToken()` — retrieve Google ID token for API calls
2. Build `src/api/client.ts` — base HTTP client:
   - Inject ID token into `Authorization` header
   - Handle 401 (token expired → re-auth)
   - Handle 429 (rate limit → exponential backoff)
   - Handle network errors
3. Build `src/api/apps-script.client.ts` — typed endpoints:
   - All endpoints from Phase 1, wrapped with request/response types
4. Build `src/api/endpoints.ts` — URL constants
5. Build `src/stores/auth.store.ts` — authentication state
6. Build `src/hooks/use-auth.ts` — auth hook wrapping GIS + store
7. Build UI components:
   - `LoginButton.tsx` — Google Sign-In button
   - `AuthGuard.tsx` — redirects to `/login` if unauthenticated
   - `UserAvatar.tsx` — shows user profile picture + name
8. Build `Login.tsx` page:
   - Centered card with app logo + tagline
   - Google Sign-In button
   - Clean, minimal design
9. Build `Setup.tsx` page (post-login, first-time flow):
   - Text input for Google Sheet URL or Sheet ID
   - "Validate & Connect" button
   - Calls `POST /sheet/validate`
   - On success: stores sheet ID, redirects to Dashboard
   - On failure: shows specific error (permission, not found, wrong format)
10. Build layout components:
    - `Header.tsx` — logo, user avatar, sync indicator
    - `BottomNav.tsx` — mobile navigation
    - `PageContainer.tsx` — responsive wrapper

**Acceptance Criteria:**
- [ ] Google Sign-In popup works end-to-end
- [ ] User can paste a Sheet URL and app validates it
- [ ] AuthGuard redirects to `/login` when not authenticated
- [ ] Header shows user's Google profile picture
- [ ] Sign out clears state and returns to login
- [ ] Token refresh happens silently (no user interruption)

---

### Phase 3 — Tracker CRUD

**Goal:** User can create, view, edit, archive, and reorder trackers.

**Estimated Complexity:** 🟡 Medium

**Dependencies:** Phase 2

**Tasks:**

1. Build `src/repositories/interfaces/i-tracker.repository.ts`
2. Build `src/repositories/gsheet/tracker.repository.ts` — implements interface via Apps Script API
3. Build `src/repositories/index.ts` — dependency injection factory
4. Build `src/services/tracker.service.ts`
5. Build `src/hooks/use-trackers.ts` — React Query hooks:
   - `useTrackers()` — query
   - `useCreateTracker()` — mutation
   - `useUpdateTracker()` — mutation
   - `useArchiveTracker()` — mutation
   - `useReorderTrackers()` — mutation
6. Build UI components:
   - `TrackerCard.tsx` — icon, name, category badge, color bar, edit/archive buttons
   - `TrackerForm.tsx` — modal form with fields:
     - Name (required), Category (optional tag), Type (boolean/numeric/duration)
     - Icon picker (emoji grid), Color picker (preset palette)
     - Target + Unit (for numeric/duration), Frequency (daily/weekly/weekday)
   - `TrackerList.tsx` — responsive grid layout with drag-and-drop reorder
   - `TrackerCardSkeleton.tsx` — loading placeholder
   - `EmptyState.tsx` — illustration + "Create your first tracker" CTA
7. Build `Trackers.tsx` page:
   - Grid of tracker cards
   - FAB button (➕) to add new tracker
   - Click card → edit modal
   - Long-press / drag handle → reorder
   - Swipe to archive (mobile) / context menu (desktop)
8. Implement optimistic updates for all mutations:
   - Create: add to cache immediately
   - Update: update cache immediately
   - Archive: remove from cache immediately
   - Reorder: reorder cache immediately
   - On error: rollback cache, show toast

**Acceptance Criteria:**
- [ ] Create a tracker → appears in grid instantly → persisted in sheet
- [ ] Edit a tracker → updates in grid instantly → cell updates in sheet
- [ ] Archive a tracker → disappears from grid → `active=FALSE` in sheet
- [ ] Reorder trackers → new order persists across page reload
- [ ] All operations work offline (queued until back online)
- [ ] Loading skeletons shown during initial load
- [ ] Empty state shown when no trackers exist

---

### Phase 4 — Daily Logging (Core Loop)

**Goal:** User can log daily entries with instant sync. This is the heart of the app.

**Estimated Complexity:** 🔴 High

**Dependencies:** Phase 3

**Tasks:**

1. Build `src/repositories/interfaces/i-log.repository.ts`
2. Build `src/repositories/gsheet/log.repository.ts` — implements interface with upsert logic
3. Build `src/services/log.service.ts`:
   - `getToday()` — fetch today's logs
   - `toggle(trackerId)` — boolean flip (true ↔ false)
   - `setValue(trackerId, value)` — numeric/duration set
   - `getWeek(date)` — fetch 7-day range
   - `getMonth(year, month)` — fetch full month
4. Build `src/services/sync.service.ts`:
   - Request queue with debounce (300ms)
   - Batch flush (combine multiple upserts into one API call)
   - Retry with exponential backoff on failure
   - Offline queue (persist pending operations)
5. Build `src/hooks/use-logs.ts` — React Query hooks:
   - `useTodaysLogs()` — query (fetches + merges with trackers)
   - `useToggleLog()` — mutation with optimistic update
   - `useSetLogValue()` — mutation with optimistic update
   - `useMonthLogs(year, month)` — query for calendar
6. Build `src/stores/toast.store.ts` — toast notification system
7. Build `src/components/layout/SyncIndicator.tsx`:
   - Green dot → synced
   - Spinning → syncing
   - Red dot → error (click for detail)
8. Enhance `TrackerCard.tsx` with logging:
   - **Boolean type:** Animated checkbox (check/uncheck with spring animation)
   - **Numeric type:** Stepper (− / + buttons with value display)
   - **Duration type:** Tap to start timer, tap again to stop (stores elapsed time)
   - Shows green checkmark when `value >= target`
   - Shows progress bar for numeric types (`current / target`)
9. Build `Dashboard.tsx` page (first version):
   - Today's tracker cards with inline logging
   - Simple stats: "6 of 8 completed today"
   - Streak counter for boolean trackers
10. Implement optimistic update for toggle:
    - UI flips immediately
    - Request queued via SyncService
    - On API success → confirm (green indicator)
    - On API failure → rollback (red indicator + toast)

**Acceptance Criteria:**
- [ ] Tap boolean checkbox → flips instantly → persisted in sheet within 1-2s
- [ ] Change numeric value → updates instantly → persisted in sheet
- [ ] Same tracker toggled multiple times rapidly → only last state matters (debounce)
- [ ] Offline → toggle works locally → syncs when back online
- [ ] Page reload → restored from sheet (matches API state)
- [ ] Dashboard shows today's trackers with current values
- [ ] Progress shown for numeric trackers (e.g., "25 / 30 pages")

---

### Phase 5 — Calendar & History

**Goal:** View past activity and navigate through time.

**Estimated Complexity:** 🟡 Medium

**Dependencies:** Phase 4

**Tasks:**

1. Build `Calendar.tsx` page:
   - Month grid (7 columns: Sun–Sat)
   - Cells show a colored indicator based on completion percentage that day
     - 100% → full green
     - >50% → partial green
     - >0% → light green
     - 0% → empty/no color
   - Tap a day → shows detail list of that day's entries
   - Navigate between months (← → arrows)
2. Build `CalendarGrid.tsx` component:
   - Responsive grid, 7 equal columns
   - Day labels (Sun, Mon, ...)
   - Empty cells for days outside the month
   - Current day highlighted
3. Build `DayDetail.tsx` component:
   - Slide-up panel (mobile) or side panel (desktop)
   - Lists all trackers with that day's value
   - Inline editing (toggle/update directly from history)
4. Add `useMonthLogs(year, month)` hook — fetches full month in one API call
5. Implement navigation like a habit tracker:
   - Default: today
   - Arrow buttons to move month by month
   - "Today" button to jump back
   - Swipe gesture (mobile) to change month

**Acceptance Criteria:**
- [ ] Month grid loads with correct number of days
- [ ] Colored indicators reflect completion percentage
- [ ] Tap a day → shows that day's entries
- [ ] Can edit entries from history view
- [ ] Navigation arrows work smoothly
- [ ] Loading state shown while month data is fetched

---

### Phase 6 — Dashboard & Analytics

**Goal:** Visualize progress with charts, streaks, and insights.

**Estimated Complexity:** 🟡 Medium

**Dependencies:** Phase 4 (can be built in parallel with Phase 5 — no cross-dependency)

**Tasks:**

1. Install Recharts
2. Build `src/lib/stats.ts` — computation utilities:
   - `calculateStreaks(logs, trackers)` — current + longest streak
   - `calculateCompletionRate(logs, trackers, dateRange)` — % completed
   - `getWeeklyData(logs, startDate)` — array of day-by-day completion
   - `getCategoryBreakdown(trackers, logs)` — completion by category
   - `getBestStreak(entries)` — longest consecutive streak
3. Build `Dashboard.tsx` (enhanced):
   - Top row: Stat cards (streak, completion rate, total logged, active trackers)
   - Weekly chart: bar chart showing daily completion count
   - Category breakdown: donut/pie chart
   - Quick log section: today's tracker cards (compact mode)
   - Recent activity: last 5 entries
4. Build components:
   - `StatCard.tsx` — icon, label, value, trend indicator
   - `WeeklyChart.tsx` — Recharts BarChart with responsive container
   - `StreakDisplay.tsx` — fire emoji + streak number + "Personal best: X"
   - `CategoryBreakdown.tsx` — Recharts PieChart with legend
5. Add date range selector (7 days / 30 days / custom)
6. Implement pull-to-refresh to re-fetch data from sheet

**Acceptance Criteria:**
- [ ] Dashboard loads within 2 seconds (cached data)
- [ ] Weekly chart renders with correct data
- [ ] Streak counter matches manual calculation
- [ ] Category chart shows correct proportions
- [ ] Quick log toggle works from dashboard
- [ ] Date range selector updates all charts

---

### Phase 7 — Settings & Polish

**Goal:** Customization, data management, and UX polish.

**Estimated Complexity:** 🟢 Low

**Dependencies:** Phase 6

**Tasks:**

1. Build `Settings.tsx` page:
   - **Sheet Management:** View connected sheet ID, disconnect, connect new sheet
   - **Appearance:** Dark mode toggle
   - **Data:** Export CSV, Export JSON, Import JSON (restore from backup)
   - **Danger Zone:** Reset all data (with confirmation dialog)
   - **About:** App version, credits, link to GitHub
2. Implement dark mode:
   - `useTheme()` hook with system preference detection
   - Persisted via sheet Metadata tab (syncs across devices)
   - Tailwind dark mode classes throughout all components
   - Smooth transition animation on theme switch
3. Implement export:
   - Generate CSV from in-memory data (no extra API calls)
   - Generate JSON with full data dump
   - Download as file
4. Implement import:
   - File picker for JSON files
   - Validate JSON against Zod schemas
   - Preview changes before importing
   - Bulk write to sheet via batch endpoint
5. Add keyboard shortcuts (desktop):
   - `n` → new tracker
   - `1-9` → toggle first 9 trackers
   - `/` → focus search
   - `t` → toggle theme
6. Add micro-animations:
   - Checkmark spring animation
   - Card appear/disappear transitions
   - Page transition between routes
   - Toast slide-in/out
7. Accessibility audit:
   - All interactive elements focusable
   - Proper ARIA labels
   - Keyboard navigation
   - Screen reader support for charts
   - Color contrast meets WCAG AA

**Acceptance Criteria:**
- [ ] Dark mode works across all pages with smooth transition
- [ ] CSV export downloads a valid file
- [ ] JSON import restores data correctly
- [ ] Keyboard shortcuts work on desktop
- [ ] All animations are smooth (60fps)
- [ ] Keyboard navigation works end-to-end
- [ ] Lighthouse accessibility score ≥ 90

---

### Phase 8 — Production Readiness

**Goal:** Error handling, performance optimization, monitoring, and deployment.

**Estimated Complexity:** 🟡 Medium

**Dependencies:** Phase 7

**Tasks:**

1. Implement comprehensive error handling:
   - **Auth errors:** Token expired → silent refresh. Refresh failed → redirect to login
   - **Network errors:** Retry with backoff. After 3 retries → show persistent error banner
   - **Rate limit (429):** Queue requests, exponential backoff, notify user
   - **Sheet errors:** Sheet deleted/renamed → show "Sheet not found" with reconnect option
   - **Validation errors:** Zod parse failure → log to console, show generic error, prevent crash
   - **Unexpected errors:** Error boundary catches, shows "Something went wrong" with reload button
2. Build error boundary component:
   - Catches rendering errors
   - Logs error details
   - Shows user-friendly recovery UI
   - "Reload" and "Go Home" buttons
3. Performance optimization:
   - Code splitting via React Router lazy loading
   - Memoize expensive computations (streaks, stats)
   - Virtualize long lists (if > 50 trackers)
   - Debounce search/filter input
   - Optimistic updates everywhere
4. Loading states:
   - Skeleton loading on initial page load
   - Skeleton loading during data refetch
   - Spinner overlay during mutations (brief)
   - Progress bar for bulk operations (import)
5. Deploy frontend to Vercel:
   - Production build configuration
   - Environment variables setup
   - Custom domain (optional)
   - Preview deployments for Pull Requests
6. Final testing pass:
   - Test all CRUD operations
   - Test offline behavior
   - Test rapid toggling (stress test)
   - Test with large datasets (100 trackers, 10k logs)
   - Test on mobile (iOS Safari, Chrome Android)
   - Test on desktop (Chrome, Firefox, Safari, Edge)

**Acceptance Criteria:**
- [ ] App works offline (queues operations, syncs when online)
- [ ] Error boundary catches and displays errors gracefully
- [ ] Lighthouse performance score ≥ 90
- [ ] Lighthouse accessibility score ≥ 90
- [ ] All pages load within 2 seconds on 3G
- [ ] Rapid toggling (10 clicks in 1 second) results in 1 API call (debounce)
- [ ] App deployed and accessible via URL

---

## 9. Risk Analysis

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | **Google Apps Script deprecation** | Low | Critical | Repository pattern makes it trivial to swap. Migrate to Cloud Functions + GSheet API directly |
| 2 | **GSheet API quota exceeded** | Medium | Medium | Apps Script middleware shares quota across users. Implement aggressive caching + batching + queue. Stay under 300 req/min |
| 3 | **User deletes or renames sheet tabs** | Medium | High | Apps Script validates sheet structure on each request. Auto-creates missing tabs. User gets clear error message |
| 4 | **OAuth token revocation** | Low | High | GIS handles token refresh silently. If refresh fails, redirect to login with preserved state |
| 5 | **Large dataset performance** | Medium | Low | Sheets can hold 10M cells. At 1M rows of logs, performance degrades. Mitigation: archive old data to a separate sheet, or paginate reads |
| 6 | **Concurrent edits from multiple devices** | Low | Medium | Last-write-wins — acceptable for single-user. If multi-user needed later, add Apps Script lock mechanism |
| 7 | **Google Sheets API changes** | Low | Medium | Repository pattern isolates API details. Only the repository implementation needs updating |
| 8 | **Browser localStorage limits** | Low | Low | Zustand stores are in-memory only. No localStorage dependency. Pending sync queue is bounded in size |
| 9 | **XSS via imported data** | Low | High | All data rendered as text (not HTML). React's escaping handles this by default. Zod validation rejects malformed data |
| 10 | **Apps Script 6-min execution limit** | Medium | Medium | Batch operations are designed to complete within seconds. If importing large datasets, chunk into batches of 100 rows |

### Scaling Limitations

| Constraint | Limit | Implication |
|------------|-------|-------------|
| **Sheets cells** | 10M cells | Fine for personal use. At 10 trackers × 5 years of daily logs = ~18K rows |
| **Sheets columns** | 18,278 columns | Current schema uses 6-13 columns — no issue |
| **Apps Script execution** | 6 min / run | Batch operations finish in seconds. Importing 10K rows may take ~30s |
| **Apps Script triggers** | 20 total | Not using triggers — only web app endpoints |
| **OAuth tokens** | User-dependent | Single user, no issue |

---

## 10. Future Enhancements

### Tier 1 — Natural Fits (Low Effort, High Value)

| Feature | Integration Point | Effort |
|---------|------------------|--------|
| **Multiple sheets per user** | Let user create separate sheets for different contexts (Work, Personal, Gym) | 1 day |
| **Daily notes/journal** | Add a `Notes` column to Logs sheet, textarea per day on Dashboard | 0.5 day |
| **Email/sms reminders** | Apps Script time-driven trigger sends reminder if no entries by 8pm | 1 day |
| **Data export to PDF** | Generate PDF report from sheet data using Apps Script | 1 day |
| **Widget/embed mode** | Public read-only view of a specific tracker (shareable link) | 2 days |

### Tier 2 — Moderate Enhancements

| Feature | Integration Point | Effort |
|---------|------------------|--------|
| **PWA support** | Service worker + manifest. Makes app installable on mobile | 2 days |
| **Chrome Extension** | Quick-log a tracker from browser toolbar | 3 days |
| **API for IFTTT/Zapier** | Expose Apps Script endpoints as public API with key-based auth | 2 days |
| **Goal setting** | Add target column enhancements: goal per week/month, rolling targets | 2 days |
| **Social features** | Share streaks with friends via link (read-only snapshot) | 3 days |

### Tier 3 — Ambitious

| Feature | Integration Point | Effort |
|---------|------------------|--------|
| **Multi-user sheets** | Shared family/team sheet. Apps Script handles conflict resolution | 1 week |
| **Mobile app (React Native)** | Reuse repository/service layers. Swap UI layer only | 3-4 weeks |
| **AI insights** | Weekly summary generated by LLM: "You ran 4 days this week, up from 3 last week" | 1 week |
| **Sheet → PostgreSQL migration** | New repository implementation. Zero UI changes. Add real-time sync | 2 weeks |
| **Webhook triggers** | Apps Script fires webhook when specific conditions met (e.g., miss 3 days in a row) | 3 days |

---

## 11. Final Review

### Architecture Scorecard

| Dimension | Score (1-10) | Notes |
|-----------|-------------|-------|
| **Maintainability** | **9/10** | Clean layered architecture, single-responsibility files, repository pattern. Loses 1 point because Apps Script introduces a second deployment pipeline |
| **Scalability** | **7/10** | Excellent for single user. Repository pattern enables backend swap. Limited by GSheet API quotas for high-frequency operations |
| **Performance** | **8/10** | Optimistic UI + caching + debounce makes the app feel instant. GSheet API latency (~200-500ms) is the bottleneck for initial load |
| **Developer Experience** | **9/10** | TypeScript, Zod validation, clear folder structure, React Query devtools, Vite HMR. Type-safe across all layers |
| **Security** | **9/10** | Apps Script hides credentials. ID token verification. Zod validation at boundaries. XSS protection via React. Loses 1 point because the Apps Script Web App is publicly accessible (mitigated by token verification) |
| **User Experience** | **9/10** | Instant interactions, optimistic UI, dark mode, responsive, accessible. Loses 1 point for missing native mobile app (PWA planned) |
| **Production Readiness** | **8/10** | Error boundaries, retry logic, loading states, toast notifications. Missing: monitoring/telemetry, automated E2E tests |
| **Enterprise Readiness** | **8/10** | SOLID principles, dependency injection, repository pattern, Zod validation. Loses 2 points for GSheet as a database — not enterprise-grade for ACID compliance |
| **Overall** | **8.4/10** | **Excellent architecture for a personal tracking app.** Production-quality patterns, clear separation of concerns, well-designed for maintainability and future extension. The GSheet dependency is the primary limitation, but the architecture is designed to outgrow it |

### How to Improve Further

1. **Add E2E tests** — Playwright or Cypress tests for critical flows (login → connect sheet → toggle tracker → verify in sheet)
2. **Add telemetry** — Optional, privacy-first error tracking (Sentry) to catch production issues
3. **Schema versioning** — Add a `schemaVersion` to the Metadata tab. Apps Script migrates data when schema changes
4. **Rate limit dashboard** — Show API usage stats in Settings (requests this minute, remaining quota)
5. **Automated sheet backup** — Apps Script time-driven trigger that duplicates the sheet weekly
6. **GitHub Actions CI** — TypeScript check + lint + test on every push. Auto-deploy Apps Script on merge

---

*End of Architecture Document. This plan should guide the entire implementation from scaffold to production.*
