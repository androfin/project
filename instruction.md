# SecureCode Lab - Interactive Security Training Platform

## Overview

SecureCode Lab is an interactive web-based security training platform for senior developers. It offers hands-on learning through labs, quizzes, and documentation on secure coding practices, focusing on OWASP Top 10 and STRIDE framework concepts. The platform teaches web security fundamentals like HTTP security headers, TLS/SSL, threat modeling, and vulnerability prevention across a 6-session, 12-hour curriculum. The goal is to provide realistic, story-based scenarios that guide users through identifying, exploiting, and fixing security flaws.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:** React 18+ with TypeScript, Vite, Wouter for routing, TanStack Query for server state, and Tailwind CSS for styling.

**UI Component System:** `shadcn/ui` components (Radix UI primitives) in "new-york" style, with a custom design system inspired by developer tools, prioritizing information density. Uses Inter for UI text and JetBrains Mono for code. Features custom color system (light/dark themes) and `ObjectUploader` for file uploads using Uppy v5.

**Key Features:** Collapsible sidebar navigation, code editor with syntax highlighting for labs, security validation feedback, accordion-style documentation, progress tracking, and quiz interface.

**Layout Pattern:** Fixed sidebar (16rem width), main content area with `max-w-7xl`, and split-pane views with resizable panels for code editing.

### Backend Architecture

**Technology Stack:** Node.js with Express.js, TypeScript, and ESM modules.

**API Design:** RESTful API under `/api` prefix, JSON format, session-based data retrieval. Endpoints cover authentication, object storage, topics, labs, quizzes, and progress tracking.

**Data Storage:** Currently uses an in-memory `MemStorage` implementation, designed for future migration to a persistent database (PostgreSQL via Drizzle ORM is configured but not active).

**Validation & Type Safety:** Zod schemas for runtime validation, shared TypeScript schemas for client/server type consistency, and structured JSON error responses.

### Data Models

**Core Entities:** Session, LabExercise, QuizQuestion, StudentProgress, DocumentationSection, SecurityHeaderCheck.

**Data Flow:** Client fetches data via TanStack Query (staleTime: Infinity), server responds with typed JSON. Progress updates use mutations with optimistic UI updates.

### Development Workflow

**Build Process:** `npm run dev` for hot-reloading (tsx + Vite), `npm run build` for production (Vite client, esbuild server).

**Code Organization:** `/client` (React frontend), `/server` (Express backend), `/shared` (shared types/schemas), `/attached_assets` (static resources).

## External Dependencies

**UI Framework & Components:** Radix UI primitives, Tailwind CSS, `class-variance-authority`, `clsx`, Lucide React, `cmdk`, `embla-carousel-react`, Uppy v5 (`@uppy/core`, `@uppy/aws-s3`, `@uppy/dashboard`, `@uppy/react`).

**Forms & Validation:** React Hook Form (`@hookform/resolvers`), Zod, `drizzle-zod`.

**Data Fetching:** TanStack Query v5.

**Database (Configured, Not Active):** Drizzle ORM v0.39+, `@neondatabase/serverless` (for PostgreSQL), `connect-pg-simple`.

**Cloud Storage:** Google Cloud Storage (`@google-cloud/storage`) via Replit Object Storage for file uploads and serving, using presigned URLs and normalized paths.

**Routing:** `wouter`.

**Date Handling:** `date-fns` v3.

**Development Tools:** Replit-specific Vite plugins, Vite, esbuild.

**Fonts:** Google Fonts CDN (Inter, JetBrains Mono).