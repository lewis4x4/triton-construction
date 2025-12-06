# Triton AI Platform - Design System & Implementation Guide

## Vision Statement

Create a **premium, enterprise-grade construction management platform** that feels modern, trustworthy, and effortless to use. The design should convey professionalism while remaining approachable—think Linear, Vercel, or Notion aesthetics applied to heavy industry.

---

## Design Principles

### 1. **Quiet Confidence**
- No visual clutter. Every element earns its place.
- Generous whitespace creates breathing room.
- Let content be the hero, not chrome.

### 2. **Functional Beauty**
- Design serves the work, not the other way around.
- Interactions feel natural and responsive.
- Information hierarchy is immediately clear.

### 3. **Professional Trust**
- Consistency builds confidence.
- Subtle animations communicate state, not distract.
- Error states are helpful, not alarming.

---

## Color System

### Primary Palette (Dark Mode Default)

```css
:root {
  /* Backgrounds - Rich, deep layers */
  --bg-primary: #0a0a0b;      /* Main background - near black */
  --bg-secondary: #111113;    /* Cards, elevated surfaces */
  --bg-tertiary: #18181b;     /* Hover states, subtle elevation */
  --bg-elevated: #1f1f23;     /* Modals, dropdowns, popovers */

  /* Borders - Subtle definition */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.1);
  --border-strong: rgba(255, 255, 255, 0.15);

  /* Text - Clear hierarchy */
  --text-primary: #fafafa;     /* Headlines, primary content */
  --text-secondary: #a1a1aa;   /* Descriptions, secondary info */
  --text-tertiary: #71717a;    /* Placeholders, disabled */
  --text-muted: #52525b;       /* Least emphasis */

  /* Accent - Refined blue (professional, trustworthy) */
  --accent-primary: #3b82f6;   /* Primary actions */
  --accent-hover: #60a5fa;     /* Hover state */
  --accent-subtle: rgba(59, 130, 246, 0.1);  /* Backgrounds */
  --accent-border: rgba(59, 130, 246, 0.3);  /* Focused borders */

  /* Semantic Colors */
  --success: #22c55e;
  --success-subtle: rgba(34, 197, 94, 0.1);
  --warning: #f59e0b;
  --warning-subtle: rgba(245, 158, 11, 0.1);
  --error: #ef4444;
  --error-subtle: rgba(239, 68, 68, 0.1);
  --info: #3b82f6;
  --info-subtle: rgba(59, 130, 246, 0.1);
}
```

### Light Mode (Optional)

```css
[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-secondary: #fafafa;
  --bg-tertiary: #f4f4f5;
  --bg-elevated: #ffffff;

  --border-subtle: rgba(0, 0, 0, 0.04);
  --border-default: rgba(0, 0, 0, 0.08);
  --border-strong: rgba(0, 0, 0, 0.12);

  --text-primary: #09090b;
  --text-secondary: #52525b;
  --text-tertiary: #a1a1aa;
}
```

---

## Typography

### Font Stack

```css
:root {
  /* Primary - Clean, modern sans-serif */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  /* Monospace - For code, numbers, IDs */
  --font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;

  /* Optional Display - For large headlines */
  --font-display: 'Cal Sans', 'Inter', sans-serif;
}
```

### Type Scale

```css
/* Headings */
.h1 { font-size: 2.25rem; font-weight: 600; letter-spacing: -0.025em; line-height: 1.2; }
.h2 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; line-height: 1.3; }
.h3 { font-size: 1.125rem; font-weight: 600; letter-spacing: -0.01em; line-height: 1.4; }
.h4 { font-size: 0.875rem; font-weight: 600; letter-spacing: 0; line-height: 1.5; }

/* Body */
.body-lg { font-size: 1rem; line-height: 1.6; }
.body { font-size: 0.875rem; line-height: 1.5; }
.body-sm { font-size: 0.8125rem; line-height: 1.5; }

/* Labels & Captions */
.label { font-size: 0.75rem; font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase; }
.caption { font-size: 0.75rem; color: var(--text-secondary); }
```

---

## Spacing System

Use an 8px base grid with a refined scale:

```css
:root {
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
}
```

---

## Component Patterns

### Cards

```css
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: var(--space-5);
  transition: all 0.15s ease;
}

.card:hover {
  border-color: var(--border-default);
  background: var(--bg-tertiary);
}

.card-elevated {
  box-shadow:
    0 0 0 1px var(--border-subtle),
    0 4px 6px -1px rgba(0, 0, 0, 0.2),
    0 2px 4px -2px rgba(0, 0, 0, 0.1);
}
```

### Buttons

```css
/* Base button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  height: 36px;
  padding: 0 var(--space-4);
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 8px;
  transition: all 0.15s ease;
  cursor: pointer;
  border: none;
}

/* Primary - Solid accent */
.btn-primary {
  background: var(--accent-primary);
  color: white;
}
.btn-primary:hover {
  background: var(--accent-hover);
}

/* Secondary - Subtle, ghost-like */
.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-default);
  color: var(--text-primary);
}
.btn-secondary:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-strong);
}

/* Ghost - Minimal */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}
.btn-ghost:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* Danger */
.btn-danger {
  background: var(--error-subtle);
  color: var(--error);
  border: 1px solid transparent;
}
.btn-danger:hover {
  background: var(--error);
  color: white;
}
```

### Inputs

```css
.input {
  height: 40px;
  padding: 0 var(--space-3);
  background: var(--bg-primary);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: all 0.15s ease;
}

.input:hover {
  border-color: var(--border-strong);
}

.input:focus {
  outline: none;
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 3px var(--accent-subtle);
}

.input::placeholder {
  color: var(--text-tertiary);
}

/* Input with label */
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-secondary);
}
```

### Tables

```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: var(--space-3) var(--space-4);
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
  border-bottom: 1px solid var(--border-default);
}

.table td {
  padding: var(--space-4);
  font-size: 0.875rem;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-subtle);
}

.table tr:hover td {
  background: var(--bg-tertiary);
}
```

---

## Layout Structure

### Sidebar Navigation

```
┌─────────────────────────────────────────────────────────┐
│ ┌─────┐                                                 │
│ │LOGO │  Triton                              ┌────────┐ │
│ └─────┘                                      │ Search │ │
│                                              └────────┘ │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│  MAIN                                                   │
│  ├─ 📊 Dashboard                                        │
│  └─ 📋 Bid Packages                                     │
│                                                         │
│  OPERATIONS                                             │
│  ├─ 🏗️ Projects                                         │
│  ├─ 📝 Daily Reports                                    │
│  └─ ⏱️ Time Tracking                                    │
│                                                         │
│  RESOURCES                                              │
│  ├─ 🚜 Equipment                                        │
│  ├─ 👷 Crew                                             │
│  └─ 📚 Specifications                                   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ⚙️ Settings                                            │
│  🔐 Role Access                                         │
│                                                         │
│ ─────────────────────────────────────────────────────── │
│  ┌────┐                                                 │
│  │ JD │ John Doe                              Sign Out  │
│  └────┘ john@triton.com                                 │
└─────────────────────────────────────────────────────────┘
```

### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  Page Title                              [ + Action ]   │
│  Description text here                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ Filters/Tabs ─────────────────────────────────────┐ │
│  │ All  Active  Completed  Archived       🔍 Search   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─ Content Area ─────────────────────────────────────┐ │
│  │                                                     │ │
│  │   Cards / Table / Form content goes here            │ │
│  │                                                     │ │
│  │                                                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Animations & Transitions

### Timing Functions

```css
:root {
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```

### Standard Durations

```css
:root {
  --duration-fast: 100ms;
  --duration-normal: 150ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;
}
```

### Micro-interactions

```css
/* Subtle hover lift */
.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

/* Button press */
.btn:active {
  transform: scale(0.98);
}

/* Focus ring animation */
.input:focus {
  animation: focusRing 0.2s ease-out;
}

@keyframes focusRing {
  from { box-shadow: 0 0 0 0 var(--accent-subtle); }
  to { box-shadow: 0 0 0 3px var(--accent-subtle); }
}

/* Loading spinner */
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-default);
  border-top-color: var(--accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
```

---

## Iconography

Use **Lucide Icons** or **Heroicons** for consistency.

- Stroke width: 1.5px (matches the refined aesthetic)
- Size: 16px for inline, 20px for buttons, 24px for navigation
- Color: Inherit from parent or use `--text-secondary`

```tsx
import { Home, FileText, Clock, Settings, ChevronRight } from 'lucide-react';

// Usage
<Home size={20} strokeWidth={1.5} />
```

---

## Integration: n8n MCP

### Connection Setup

```typescript
// packages/shared/src/integrations/n8n.ts

export interface N8nMCPConfig {
  serverUrl: string;
  apiKey: string;
  webhookSecret?: string;
}

export class N8nMCPClient {
  constructor(private config: N8nMCPConfig) {}

  // Execute a workflow
  async executeWorkflow(workflowId: string, data: Record<string, unknown>) {
    const response = await fetch(`${this.config.serverUrl}/webhook/${workflowId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  // Trigger via MCP protocol
  async mcpCall(tool: string, params: Record<string, unknown>) {
    // MCP tool invocation
  }
}
```

### UI Components for n8n

```tsx
// Workflow trigger button
function WorkflowTrigger({ workflowId, label }: Props) {
  const [isRunning, setIsRunning] = useState(false);

  return (
    <button
      className={`btn btn-secondary ${isRunning ? 'loading' : ''}`}
      onClick={() => triggerWorkflow(workflowId)}
    >
      {isRunning ? <Spinner /> : <Zap size={16} />}
      {label}
    </button>
  );
}
```

---

## Integration: Supabase

### Client Configuration

```typescript
// packages/supabase-client/src/client.ts

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
```

### Real-time Subscriptions

```typescript
// Subscribe to changes
supabase
  .channel('projects')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'projects'
  }, (payload) => {
    // Update local state
  })
  .subscribe();
```

---

## File Structure

```
apps/
├── web/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # Primitives (Button, Input, Card, etc.)
│   │   │   ├── layout/       # Layout components (Sidebar, Header, etc.)
│   │   │   └── features/     # Feature-specific components
│   │   ├── pages/            # Route pages
│   │   ├── hooks/            # Custom React hooks
│   │   ├── styles/
│   │   │   ├── globals.css   # CSS variables, base styles
│   │   │   ├── components/   # Component-specific styles
│   │   │   └── utilities.css # Utility classes
│   │   ├── lib/              # Utilities, helpers
│   │   └── types/            # TypeScript types
│   └── index.html
│
packages/
├── supabase-client/          # Supabase client & types
├── shared/                   # Shared utilities & types
└── ui/                       # Shared UI component library (optional)
```

---

## Sample Implementation Prompt

Use this prompt to generate new pages/components:

```
Create a [COMPONENT/PAGE NAME] for the Triton Construction AI Platform.

Design Requirements:
- Dark mode default with near-black (#0a0a0b) background
- Use Inter font family
- Cards have subtle borders (rgba(255,255,255,0.06)) with 12px radius
- Buttons: 36px height, 8px radius, smooth hover transitions
- Generous spacing using 8px grid system
- Minimal, professional aesthetic (think Linear/Vercel)
- No emojis in the UI (use Lucide icons instead)

Technical Requirements:
- React + TypeScript
- CSS Modules or plain CSS (no Tailwind unless specified)
- Use Supabase for data fetching
- Mobile-responsive with sidebar collapse
- Loading and error states handled gracefully

Color tokens to use:
- Backgrounds: #0a0a0b, #111113, #18181b
- Text: #fafafa (primary), #a1a1aa (secondary), #71717a (tertiary)
- Accent: #3b82f6 (blue)
- Borders: rgba(255,255,255,0.06-0.15)

The component should feel premium, trustworthy, and effortless to use.
```

---

## Quick Start Checklist

- [ ] Install Inter font (Google Fonts or self-hosted)
- [ ] Install Lucide React icons: `pnpm add lucide-react`
- [ ] Set up CSS variables in `globals.css`
- [ ] Create base UI components (Button, Input, Card)
- [ ] Implement new Sidebar with grouped navigation
- [ ] Convert existing pages to new design system
- [ ] Add loading skeletons for async content
- [ ] Test responsive behavior on mobile
- [ ] Configure n8n MCP connection
- [ ] Verify Supabase real-time subscriptions

---

*This design system prioritizes clarity, professionalism, and user confidence. Every interaction should feel intentional and refined.*
