# TRITON CONSTRUCTION AI PLATFORM
## Database Foundation Handoff Document
### Date: December 5, 2024

---

# EXECUTIVE SUMMARY

We have successfully established the database foundation for the Triton Construction AI Operations Platform. This foundation consists of 5 sequential SQL migrations that create a secure, auditable, WVDOH-compliant data architecture hosted on Supabase (PostgreSQL).

**Total Tables Created:** 32
**Total Views Created:** 7
**Total Helper Functions:** 15+
**Row Level Security:** Enabled on ALL tables
**Audit Logging:** Automatic on all user-modifiable data

---

# PART 1: WHAT WAS BUILT

## 1.1 Supabase Project

**Project Reference:** `gablgsruyuhvjurhtcxx`
**Project URL:** `https://gablgsruyuhvjurhtcxx.supabase.co`
**Region:** (Set during project creation)

### Credentials (SECURE THESE)

```
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYmxnc3J1eXVodmp1cmh0Y3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDY3OTUsImV4cCI6MjA4MDUyMjc5NX0.nHQONhNgmXxThXUfgGa1p4HTfr43tShAGgenxej74uI

Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYmxnc3J1eXVodmp1cmh0Y3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0Njc5NSwiZXhwIjoyMDgwNTIyNzk1fQ.3gmXsKaWtBuQTSR2Rt_2A-oVqrjvIjQ3-LQFr7ONniA
```

**CRITICAL:** 
- Anon Key = Safe for client-side (browser/mobile)
- Service Role Key = Server-side ONLY, never expose to clients

---

## 1.2 Migration Files Created

All migrations are SQL files designed to run in Supabase SQL Editor in sequential order.

| File | Purpose | Tables Created |
|------|---------|----------------|
| `001_foundation_schema.sql` | Core identity, auth, audit infrastructure | 9 |
| `002_projects_schema.sql` | Project management and assignments | 6 |
| `003_crew_equipment_schema.sql` | Workforce and fleet management | 7 |
| `004_daily_reports_schema.sql` | Voice-first daily field reporting | 7 |
| `005_time_tracking_schema.sql` | Time entries and certified payroll | 6 |

---

## 1.3 Complete Table Inventory

### Migration 001: Foundation Schema

| Table | Purpose | RLS | Audit |
|-------|---------|-----|-------|
| `organizations` | Multi-tenant root, company details | ✅ | ✅ |
| `user_profiles` | Extended user data (links to Supabase Auth) | ✅ | ✅ |
| `permissions` | Granular permission definitions (44 seeded) | ✅ | ❌ |
| `roles` | Role definitions with hierarchy (6 seeded) | ✅ | ✅ |
| `role_permissions` | Role-to-permission mappings | ✅ | ❌ |
| `user_roles` | User-to-role assignments (project-scoped) | ✅ | ✅ |
| `audit_logs` | Immutable change log for all data | ✅ | ❌ |
| `auth_events` | Login/logout/security events | ✅ | ❌ |
| `api_access_logs` | API request tracking | ✅ | ❌ |

**Seeded System Roles:**
| Role | Level | Description |
|------|-------|-------------|
| ADMIN | 1 | Full system access |
| EXECUTIVE | 10 | Read all, limited write |
| PROJECT_MANAGER | 20 | Full access to assigned projects |
| SUPERINTENDENT | 30 | Field operations lead |
| FOREMAN | 40 | Crew management and time entry |
| FIELD_USER | 50 | Basic data entry only |

**Seeded Permissions (44 total):**
- organization.read, organization.update
- users.read, users.create, users.update, users.delete, users.manage_roles
- projects.read, projects.create, projects.update, projects.delete, projects.assign_users
- daily_reports.read, daily_reports.create, daily_reports.update, daily_reports.delete, daily_reports.approve, daily_reports.export
- time_tracking.read, time_tracking.create, time_tracking.update, time_tracking.delete, time_tracking.approve
- equipment.read, equipment.create, equipment.update, equipment.delete, equipment.transfer
- materials.read, materials.create, materials.update, materials.reconcile
- safety.read, safety.create, safety.update, safety.approve
- quality.read, quality.create, quality.update, quality.approve
- documents.read, documents.create, documents.update, documents.delete
- reports.read, reports.export
- admin.audit_logs, admin.system_settings

### Migration 002: Projects Schema

| Table | Purpose | RLS | Audit |
|-------|---------|-----|-------|
| `projects` | Construction projects with WVDOH fields | ✅ | ✅ |
| `project_assignments` | User-to-project access with project roles | ✅ | ✅ |
| `project_locations` | Geofenced boundaries for GPS validation | ✅ | ✅ |
| `cost_codes` | Cost code hierarchy for tracking | ✅ | ✅ |
| `project_phases` | Milestones and schedule phases | ✅ | ✅ |
| `project_contacts` | External contacts (WVDOH, utilities) | ✅ | ✅ |

**Key Project Fields:**
- WVDOH: contract_number, federal_aid_number, wvdoh_district, wvdoh_inspector
- Compliance: is_federal_aid, davis_bacon_required, dbe_goal_percentage, buy_america_required
- Schedule: working_days tracking (original, current, used)
- Financial: original_contract_value, current_contract_value

### Migration 003: Crew & Equipment Schema

| Table | Purpose | RLS | Audit |
|-------|---------|-----|-------|
| `crew_members` | Field workers with EEO data | ✅ | ✅ |
| `crew_certifications` | OSHA, CDL, other certs with expiration | ✅ | ✅ |
| `equipment` | Fleet with telematics integration | ✅ | ✅ |
| `equipment_assignments` | Equipment allocation to projects | ✅ | ✅ |
| `subcontractors` | Sub companies with DBE tracking | ✅ | ✅ |
| `subcontractor_insurance` | Insurance policies with expiration | ✅ | ✅ |
| `suppliers` | Material suppliers with WVDOH approval | ✅ | ✅ |

**Key Features:**
- EEO tracking: gender, ethnicity, veteran status, disability
- Trade classifications for Davis-Bacon compliance
- Telematics providers: CAT, John Deere, Komatsu, Volvo, etc.
- DBE certification tracking with expiration alerts
- Insurance expiration monitoring

### Migration 004: Daily Reports Schema

| Table | Purpose | RLS | Audit |
|-------|---------|-----|-------|
| `daily_reports` | Main report with weather, status workflow | ✅ | ✅ |
| `daily_report_entries` | Work activities, delays, visitors | ✅ | ✅ |
| `voice_recordings` | Audio files with Whisper transcription | ✅ | ❌ |
| `report_photos` | GPS-tagged photos with AI analysis | ✅ | ❌ |
| `weather_snapshots` | Historical weather from API | ✅ | ❌ |
| `daily_manpower` | Crew hours by trade/cost code | ✅ | ✅ |
| `daily_equipment_log` | Equipment hours, fuel, meters | ✅ | ✅ |

**Report Workflow:**
```
DRAFT → SUBMITTED → REVIEWED → APPROVED
                            ↘ REJECTED → REVISED
```

**WVDOH Features:**
- Working day tracking (is_working_day, working_day_number)
- Weather documentation with API integration
- WVDOH sharing capability with inspector comments
- Auto-generated report numbers: PROJECT-YYYYMMDD-001

### Migration 005: Time Tracking Schema

| Table | Purpose | RLS | Audit |
|-------|---------|-----|-------|
| `pay_periods` | Payroll periods with status | ✅ | ✅ |
| `wage_rates` | Prevailing wage rates by trade | ✅ | ✅ |
| `time_entries` | Individual time records | ✅ | ✅ |
| `certified_payrolls` | WH-347 certified payroll header | ✅ | ✅ |
| `certified_payroll_lines` | Employee detail lines | ✅ | ❌ |
| `dbe_participation` | DBE utilization tracking | ✅ | ✅ |

**Davis-Bacon Compliance:**
- Wage determination number tracking
- Base rate + fringe rate separation
- Overtime/double-time multiplier support
- Trade classification enforcement

**Certified Payroll Workflow:**
```
DRAFT → GENERATED → REVIEWED → CERTIFIED → SUBMITTED → ACCEPTED
                                                    ↘ REJECTED
```

---

## 1.4 Views Created

| View | Source Migration | Purpose |
|------|------------------|---------|
| `v_active_projects` | 002 | Active projects with key metrics |
| `v_active_crew` | 003 | Active crew with certification summary |
| `v_equipment_status` | 003 | Equipment fleet with maintenance status |
| `v_recent_daily_reports` | 004 | Daily reports with project info, counts |
| `v_pending_report_approvals` | 004 | Reports awaiting approval |
| `v_pending_time_approvals` | 005 | Time entries awaiting approval |
| `v_weekly_timesheets` | 005 | Weekly summary by worker |

---

## 1.5 Helper Functions Created

### Authentication & Authorization
| Function | Purpose |
|----------|---------|
| `user_has_permission(user_id, permission_code, project_id)` | Check specific permission |
| `get_user_organization_id(user_id)` | Get user's organization |
| `get_user_role_level(user_id)` | Get highest role level (lowest number) |

### Project Functions
| Function | Purpose |
|----------|---------|
| `user_is_on_project(user_id, project_id)` | Check project assignment |
| `get_user_project_role(user_id, project_id)` | Get role on specific project |
| `get_user_projects(user_id)` | Get all user's active projects |
| `is_within_project_geofence(project_id, lat, lng)` | GPS validation |

### Crew & Equipment Functions
| Function | Purpose |
|----------|---------|
| `get_expiring_certifications(days_ahead)` | Crew certs expiring soon |
| `get_equipment_maintenance_due(days_ahead)` | Equipment needing service |
| `get_expiring_insurance(days_ahead)` | Sub insurance expiring |

### Daily Reports Functions
| Function | Purpose |
|----------|---------|
| `generate_report_number(project_id, date)` | Auto report numbering |
| `update_daily_report_totals(report_id)` | Recalculate manpower/equipment |
| `get_project_report_summary(project_id, start, end)` | Aggregated stats |

### Time Tracking Functions
| Function | Purpose |
|----------|---------|
| `get_wage_rate(org, project, trade, date)` | Find applicable wage rate |
| `calculate_weekly_overtime(crew_member, date)` | Weekly OT breakdown |
| `get_next_payroll_number(project)` | Auto-increment payroll number |
| `get_crew_timesheet_summary(crew, start, end)` | Timesheet report |

---

## 1.6 Triggers Implemented

### Automatic Timestamps
Every table with `updated_at` has trigger:
```sql
CREATE TRIGGER [table]_updated_at
    BEFORE UPDATE ON public.[table]
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

### Audit Logging
All user-modifiable tables have:
```sql
CREATE TRIGGER [table]_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.[table]
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();
```

### Special Triggers
| Trigger | Table | Purpose |
|---------|-------|---------|
| `on_auth_user_created` | auth.users | Auto-create user_profile on signup |
| `daily_reports_before_insert` | daily_reports | Auto-generate report number |
| `time_entries_before_insert` | time_entries | Auto-assign pay period, set flags, get wage rate |

---

## 1.7 Security Model

### Row Level Security (RLS)

**Every table has RLS enabled.** Key patterns:

1. **Organization Isolation**
   - Users only see data in their organization
   - `organization_id = public.get_user_organization_id()`

2. **Project-Based Access**
   - Users only see projects they're assigned to
   - Executives/Admins see all projects in org

3. **Role-Based Permissions**
   - Permission checks via `user_has_permission()`
   - Role level checks via `get_user_role_level()`

4. **Owner-Based Access**
   - Authors can edit their own drafts
   - Approvers can edit any

### Audit Trail

The `audit_logs` table captures:
- `table_name` — Which table changed
- `record_id` — Which record changed
- `action` — INSERT, UPDATE, DELETE
- `old_data` — Previous values (JSONB)
- `new_data` — New values (JSONB)
- `changed_fields` — Array of field names that changed
- `user_id` / `user_email` — Who made the change
- `ip_address` — Client IP
- `created_at` — When it happened

**Audit logs are append-only** — no UPDATE or DELETE allowed.

---

# PART 2: HOW TO USE IT

## 2.1 Connecting to Supabase

### JavaScript/TypeScript Client
```typescript
import { createClient } from '@supabase/supabase-js'

// Client-side (browser/mobile)
const supabase = createClient(
  'https://gablgsruyuhvjurhtcxx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Anon key
)

// Server-side (Edge Functions, API routes)
const supabaseAdmin = createClient(
  'https://gablgsruyuhvjurhtcxx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Service role key
)
```

### Direct Database Connection
```
Host: db.gablgsruyuhvjurhtcxx.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [from Supabase dashboard]
```

## 2.2 Creating the First Organization

```sql
-- Insert organization
INSERT INTO public.organizations (
    name, 
    slug, 
    legal_name,
    address_line1,
    city,
    state,
    zip_code,
    phone,
    wv_contractor_license
) VALUES (
    'Triton Construction',
    'triton-construction',
    'Triton Construction, Inc.',
    '123 Main Street',
    'St. Albans',
    'WV',
    '25177',
    '304-555-1234',
    'WV-12345'
);
```

## 2.3 Creating Users

Users are created through Supabase Auth. The `handle_new_user()` trigger automatically creates the user_profile.

```typescript
// Sign up with organization assignment
const { data, error } = await supabase.auth.signUp({
  email: 'user@triton.com',
  password: 'securepassword',
  options: {
    data: {
      first_name: 'John',
      last_name: 'Smith',
      organization_id: 'uuid-of-organization'
    }
  }
})
```

## 2.4 Assigning Roles

```sql
-- Get role ID
SELECT id FROM public.roles WHERE code = 'SUPERINTENDENT';

-- Assign role to user
INSERT INTO public.user_roles (user_id, role_id)
VALUES ('user-uuid', 'role-uuid');

-- Assign project-specific role
INSERT INTO public.user_roles (user_id, role_id, project_id)
VALUES ('user-uuid', 'foreman-role-uuid', 'project-uuid');
```

## 2.5 Creating a Project

```sql
INSERT INTO public.projects (
    organization_id,
    project_number,
    name,
    contract_number,
    project_type,
    contract_type,
    original_contract_value,
    notice_to_proceed_date,
    original_completion_date,
    original_working_days,
    current_working_days,
    is_federal_aid,
    davis_bacon_required,
    dbe_goal_percentage,
    wvdoh_district,
    status
) VALUES (
    'org-uuid',
    '2024-001',
    'Corridor H Section 12',
    'DOH-2024-0123',
    'HIGHWAY',
    'UNIT_PRICE',
    15000000.00,
    '2024-03-01',
    '2025-09-30',
    180,
    180,
    TRUE,
    TRUE,
    8.5,
    8,
    'ACTIVE'
);
```

## 2.6 Assigning Users to Projects

```sql
INSERT INTO public.project_assignments (
    project_id,
    user_id,
    project_role,
    is_primary
) VALUES (
    'project-uuid',
    'user-uuid',
    'SUPERINTENDENT',
    TRUE
);
```

## 2.7 Querying Data with RLS

When querying as an authenticated user, RLS automatically filters:

```typescript
// User only sees their assigned projects
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .eq('status', 'ACTIVE')

// User only sees time entries for their projects
const { data: timeEntries } = await supabase
  .from('time_entries')
  .select(`
    *,
    crew_members(display_name),
    projects(name)
  `)
  .eq('status', 'PENDING')
```

---

# PART 3: ROADMAP FORWARD

## 3.1 Remaining Database Migrations

### Phase 1 Completion (Months 1-3)

| Migration | Module | Priority | Status |
|-----------|--------|----------|--------|
| 006 | Safety Management | HIGH | Pending |
| 007 | Materials & Deliveries | HIGH | Pending |
| 008 | Quality Control | MEDIUM | Pending |

### Migration 006: Safety Management
```
Tables:
- toolbox_talks          → Safety meeting records
- talk_acknowledgments   → Worker sign-offs
- job_safety_analysis    → JSA/JHA documents
- incidents              → Accident/injury reports
- near_misses            → Near-miss reports
- safety_observations    → Positive/negative observations
- osha_300_logs          → OSHA recordkeeping
- safety_violations      → Violation tracking

Features:
- Site-specific toolbox talk templates
- AI-generated JSA from daily activities
- Incident investigation workflow
- OSHA 300/300A/301 form generation
- Leading indicator tracking
- EMR calculation support
```

### Migration 007: Materials & Deliveries
```
Tables:
- purchase_orders        → PO management
- po_line_items          → PO details
- delivery_tickets       → Material deliveries
- ticket_line_items      → Delivery details
- ocr_extractions        → OCR processing results
- material_reconciliation → PO to delivery matching
- material_inventory     → On-site inventory
- batch_tickets          → Concrete batch records
- asphalt_tickets        → Asphalt tonnage records

Features:
- OCR extraction from ticket photos
- Auto-match deliveries to POs
- Variance flagging and alerts
- Concrete/asphalt specific tracking
- Buy America compliance documentation
- Supplier quality scoring
```

### Migration 008: Quality Control
```
Tables:
- inspections            → QC inspection records
- inspection_checklists  → Checklist templates
- checklist_items        → Individual check items
- test_results           → Lab/field test results
- test_types             → Test type definitions
- non_conformances       → NCR tracking
- punch_lists            → Punch list items
- hold_points            → ITP hold points

Features:
- WVDOH inspection checklist templates
- Digital signature capture
- Test result trending
- NCR workflow with corrective actions
- Punch list management
- ITP (Inspection Test Plan) support
```

### Phase 2 (Months 4-6)

| Migration | Module | Priority |
|-----------|--------|----------|
| 009 | Subcontractor Management | HIGH |
| 010 | Document Management | MEDIUM |
| 011 | Change Order Tracking | HIGH |
| 012 | RFI Management | MEDIUM |

### Phase 3 (Months 7-9)

| Migration | Module | Priority |
|-----------|--------|----------|
| 013 | AI Query Infrastructure | HIGH |
| 014 | Bid Intelligence | MEDIUM |
| 015 | Predictive Analytics | MEDIUM |

---

## 3.2 Application Development Roadmap

### Web Application (React + TypeScript + Vite)

**Phase 1 - Core Functionality**
1. Authentication flows (login, signup, password reset)
2. Organization setup wizard
3. Project management dashboard
4. User/role management
5. Daily report creation and approval
6. Time entry and approval
7. Basic reporting

**Phase 2 - Field Operations**
1. Equipment tracking dashboard
2. Crew management
3. Safety module
4. Materials reconciliation
5. QC inspections

**Phase 3 - Intelligence**
1. AI query interface
2. Executive dashboards
3. Predictive alerts
4. Advanced reporting

### Mobile Application (React Native + Expo)

**Phase 1 - Field Capture**
1. Voice recording for daily reports
2. Photo capture with GPS
3. Time clock (in/out)
4. Offline data queue

**Phase 2 - Full Functionality**
1. Daily report creation
2. Time entry for crew
3. Equipment logs
4. Safety observations
5. Delivery ticket OCR

**Phase 3 - Intelligence**
1. Voice query ("What did we pour yesterday?")
2. Push notifications
3. Offline-first architecture

---

## 3.3 Integration Requirements

### External APIs Needed

| Service | Purpose | Priority |
|---------|---------|----------|
| OpenAI Whisper | Voice transcription | HIGH |
| Claude API | AI processing, report generation | HIGH |
| OpenWeatherMap | Weather data | HIGH |
| Google Document AI | OCR extraction | HIGH |
| Mapbox | GPS/mapping | MEDIUM |
| CAT Product Link | Equipment telematics | MEDIUM |
| John Deere JDLink | Equipment telematics | MEDIUM |

### Environment Variables Required

```bash
# Supabase
SUPABASE_URL=https://gablgsruyuhvjurhtcxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# AI Services
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# External APIs
GOOGLE_CLOUD_API_KEY=
MAPBOX_ACCESS_TOKEN=
OPENWEATHERMAP_API_KEY=

# Telematics (when ready)
CAT_PRODUCT_LINK_API_KEY=
JOHN_DEERE_CLIENT_ID=
JOHN_DEERE_CLIENT_SECRET=
```

---

## 3.4 Edge Functions to Build

### Phase 1 Priority Functions

| Function | Purpose |
|----------|---------|
| `voice-transcribe` | Process voice recordings with Whisper |
| `daily-report-generate` | AI-structure transcript into report |
| `weather-fetch` | Get weather for project locations |
| `ocr-process` | Extract data from delivery ticket photos |
| `report-finalize` | Generate PDF, calculate totals |
| `certified-payroll-generate` | Create WH-347 from time entries |

### Phase 2 Functions

| Function | Purpose |
|----------|---------|
| `ai-query` | Natural language project queries |
| `safety-alert-check` | Monitor for safety issues |
| `maintenance-predict` | Equipment maintenance predictions |
| `dbe-report-generate` | Monthly DBE utilization reports |

---

## 3.5 Storage Buckets to Create

In Supabase Storage, create these buckets:

| Bucket | Purpose | Public |
|--------|---------|--------|
| `voice-recordings` | Daily report audio files | No |
| `report-photos` | GPS-tagged field photos | No |
| `delivery-tickets` | Material ticket images | No |
| `documents` | Project documents | No |
| `safety-photos` | Incident/observation photos | No |
| `avatars` | User profile photos | Yes |
| `exports` | Generated PDFs, reports | No |

---

# PART 4: DEVELOPMENT GUIDELINES

## 4.1 Code Standards

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Database Types Generation
```bash
# Generate TypeScript types from Supabase schema
npx supabase gen types typescript --project-id gablgsruyuhvjurhtcxx > src/types/database.ts
```

### Naming Conventions
- Tables: `snake_case`, plural (`daily_reports`)
- Columns: `snake_case` (`created_at`)
- Functions: `snake_case` (`get_user_projects`)
- TypeScript: `camelCase` for variables, `PascalCase` for types
- React Components: `PascalCase` (`DailyReportCard.tsx`)

## 4.2 Git Workflow

```
main                    → Production
├── develop             → Integration branch
│   ├── feature/xxx     → New features
│   ├── fix/xxx         → Bug fixes
│   └── refactor/xxx    → Code improvements
```

### Commit Message Format
```
type(scope): description

feat(daily-reports): add voice recording upload
fix(time-tracking): correct overtime calculation
refactor(auth): simplify permission checking
docs(api): add endpoint documentation
```

## 4.3 Testing Requirements

| Layer | Tool | Minimum Coverage |
|-------|------|------------------|
| Unit Tests | Vitest | 80% |
| Integration Tests | Vitest + Supabase | 70% |
| E2E Tests | Playwright | Critical paths |
| API Tests | Vitest | All endpoints |

## 4.4 Security Checklist

Before any deployment:
- [ ] All tables have RLS enabled
- [ ] Service role key not exposed to client
- [ ] Sensitive fields encrypted at application level
- [ ] Input validation on all user inputs
- [ ] Rate limiting on API endpoints
- [ ] CORS configured properly
- [ ] Audit logging active

---

# PART 5: IMMEDIATE NEXT STEPS

## Week 1-2: Complete Database Foundation

1. **Run Migration 006: Safety Management**
2. **Run Migration 007: Materials & Deliveries**
3. **Run Migration 008: Quality Control**
4. **Create Storage Buckets**
5. **Generate TypeScript Types**

## Week 3-4: Application Scaffolding

1. **Initialize Web App**
   ```bash
   pnpm create vite apps/web --template react-ts
   cd apps/web
   pnpm add @supabase/supabase-js @tanstack/react-query
   ```

2. **Initialize Mobile App**
   ```bash
   npx create-expo-app apps/mobile -t expo-template-blank-typescript
   cd apps/mobile
   npx expo install @supabase/supabase-js
   ```

3. **Set Up Shared Package**
   ```bash
   mkdir -p packages/shared/src/{types,utils,constants}
   ```

4. **Configure Supabase CLI**
   ```bash
   npx supabase login
   npx supabase link --project-ref gablgsruyuhvjurhtcxx
   ```

## Week 5-6: Core Auth & First Module

1. **Implement Authentication**
   - Login/logout flows
   - Password reset
   - Session management

2. **Build Daily Reports MVP**
   - Report list view
   - Report creation form
   - Voice recording (web)
   - Photo upload
   - Submit for approval

---

# PART 6: SUPPORT RESOURCES

## Documentation Links

- Supabase Docs: https://supabase.com/docs
- Supabase JavaScript Client: https://supabase.com/docs/reference/javascript
- React Native: https://reactnative.dev/docs
- Expo: https://docs.expo.dev
- Claude API: https://docs.anthropic.com
- OpenAI Whisper: https://platform.openai.com/docs/guides/speech-to-text

## Supabase Dashboard

- Dashboard: https://supabase.com/dashboard/project/gablgsruyuhvjurhtcxx
- SQL Editor: Dashboard → SQL Editor
- Table Editor: Dashboard → Table Editor
- Auth Users: Dashboard → Authentication → Users
- Storage: Dashboard → Storage
- Edge Functions: Dashboard → Edge Functions
- Logs: Dashboard → Logs

## Project Contacts

- **Project Owner:** Brian T. Lewis (brian@redexllc.com)
- **Primary Client:** Triton Construction, Inc., St. Albans, WV

---

# APPENDIX A: MIGRATION RUN ORDER

**CRITICAL: Run migrations in exact order. Each depends on previous.**

```
1. 001_foundation_schema.sql     ✅ COMPLETE
2. 002_projects_schema.sql       ✅ COMPLETE
3. 003_crew_equipment_schema.sql ✅ COMPLETE
4. 004_daily_reports_schema.sql  ✅ COMPLETE
5. 005_time_tracking_schema.sql  ✅ COMPLETE
6. 006_safety_schema.sql         ⏳ PENDING
7. 007_materials_schema.sql      ⏳ PENDING
8. 008_quality_schema.sql        ⏳ PENDING
```

To run a migration:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Click "New Query"
4. Paste entire migration file
5. Click "Run"
6. Verify success message

---

# APPENDIX B: TROUBLESHOOTING

## Common Issues

### "permission denied for table"
- RLS is blocking access
- Check user is authenticated
- Check user has required role/permission
- Check user is assigned to project

### "violates foreign key constraint"
- Parent record doesn't exist
- Create parent record first
- Check UUID is correct

### "duplicate key value violates unique constraint"
- Record already exists
- Use upsert or check before insert

### "function does not exist"
- Migration not run
- Wrong schema (use `public.function_name`)

### Migration failed partially
- Run cleanup SQL (DROP statements)
- Re-run entire migration

---

# APPENDIX C: QUICK REFERENCE

## Role Levels (Lower = More Powerful)
```
1  = ADMIN
10 = EXECUTIVE
20 = PROJECT_MANAGER
30 = SUPERINTENDENT
40 = FOREMAN
50 = FIELD_USER
```

## Status Enums

**Daily Reports:**
`DRAFT` → `SUBMITTED` → `REVIEWED` → `APPROVED` / `REJECTED` → `REVISED`

**Time Entries:**
`PENDING` → `SUBMITTED` → `APPROVED` / `REJECTED` → `PAID`

**Certified Payrolls:**
`DRAFT` → `GENERATED` → `REVIEWED` → `CERTIFIED` → `SUBMITTED` → `ACCEPTED` / `REJECTED`

**Projects:**
`PLANNING` → `BIDDING` → `AWARDED` → `MOBILIZATION` → `ACTIVE` → `SUBSTANTIAL_COMPLETION` → `PUNCH_LIST` → `COMPLETE` → `CLOSED`

---

*Document generated: December 5, 2024*
*Last migration completed: 005_time_tracking_schema.sql*
