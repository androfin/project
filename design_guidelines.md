# Design Guidelines: Security Training Lab Platform

## Design Approach
**System-Based:** Drawing from VS Code, Linear, and GitHub's developer tool patterns. Prioritizing information density, code readability, and efficient learning workflows for senior developers.

## Typography System

**Font Families:**
- Interface: Inter (via Google Fonts CDN)
- Code: JetBrains Mono (via Google Fonts CDN)

**Hierarchy:**
- Page titles: text-3xl font-bold
- Section headers: text-xl font-semibold
- Subsections: text-lg font-medium
- Body text: text-base
- Code snippets: text-sm font-mono
- Captions/metadata: text-xs

## Layout System

**Spacing Primitives:** Consistent use of Tailwind units: 2, 4, 6, 8, 12, 16 (e.g., p-4, gap-8, space-y-6)

**Core Layout Structure:**
- Fixed sidebar navigation (w-64) with collapsible sections for session topics
- Main content area with max-w-7xl container
- Split-pane editor view: 50/50 code editor + live preview (resizable)
- Sticky header with progress indicator and session navigation

## Component Library

**Navigation:**
- Left sidebar: Vertical session list with expandable subsections, active state highlighting
- Top bar: Breadcrumb navigation, session timer, user progress badge
- Session progress indicators using step components with check marks

**Code Editor Interface:**
- Monaco-style editor frame with line numbers, syntax highlighting zones
- Tab interface for multiple file editing (e.g., server.js, index.html, config)
- Action toolbar: Run Code, Reset, View Diff, Submit buttons
- Console output panel (collapsible, h-48 default)

**Documentation Panel:**
- Accordion-style sections for OWASP Top 10, STRIDE framework concepts
- Code blocks with copy button (top-right corner)
- Info callouts for best practices (border-l-4 with icon)
- Warning/danger alerts for common pitfalls

**Lab Exercise Cards:**
- Card-based layout (rounded-lg, shadow-md)
- Exercise number badge, difficulty indicator, estimated time
- Collapsible instruction section
- Validation results panel showing pass/fail for each security header check
- Before/after comparison view (side-by-side panels)

**Quiz Module:**
- Question cards with single-select/multi-select radio/checkbox groups
- Immediate feedback on submission (correct/incorrect indicators)
- Progress bar showing X/10 questions completed
- Results summary card with score and review option

**Security Validator:**
- Real-time validation badges (checkmark/X icons from Heroicons)
- Checklist format: HSTS ✓, CSP ✓, X-Frame-Options ✗
- Expandable details showing curl command output and browser devtools screenshots

## Page Structure

**Main Lab View:**
1. Top bar (h-16): Session title, timer, progress (4/6 labs completed)
2. Three-column layout:
   - Sidebar (w-64): Session navigation tree
   - Instructions/Docs (w-96): Scrollable exercise description, documentation
   - Editor + Preview (flex-1): Split-pane workspace
3. Bottom panel (h-auto): Console/validation output

**Session Overview Page:**
- Hero section (h-64): Session number, title, learning outcomes list
- Grid layout (grid-cols-3 gap-6): Lab cards with status badges
- Right sidebar: Resources, reference links, quiz access

## Interactive Elements

**State Management:**
- Disabled state for locked labs (requires previous completion)
- Active/current lab highlighting with distinct treatment
- Completed state with checkmark badge
- Progress percentage ring chart (top-right of each session card)

**Feedback Mechanisms:**
- Toast notifications for validation success/failure (top-right, slide-in)
- Inline error messages in code editor (red squiggly underlines)
- Success animations: Subtle scale-up + fade for completed labs

## Images

**Hero Section:** No large hero image needed - this is a functional tool, not marketing
**Instructional Images:** Include diagram placeholders for:
- HTTP request/response flow visualization (Session 1.3)
- TLS handshake diagram (Session 1.3.2)
- Security header flow diagram (Session 1.4)
- Place these as inline images within documentation panels (max-w-2xl, rounded border)

## Accessibility

- Keyboard navigation for all interactive elements (Tab, Enter, Esc)
- ARIA labels for icon-only buttons
- Skip-to-content links for main sections
- Code editor implements standard shortcuts (Ctrl+S, Ctrl+Z)
- High contrast text on all backgrounds
- Focus indicators (ring-2) on all interactive elements

## Animations

**Minimal Use Only:**
- Tab switching: 150ms fade transition
- Accordion expand/collapse: 200ms height transition
- Validation result appearance: 100ms fade-in
- No distracting scroll animations or page transitions