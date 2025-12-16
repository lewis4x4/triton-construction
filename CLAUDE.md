# TRITON CONSTRUCTION AI PLATFORM
## Complete System Documentation
### Last Updated: December 14, 2025

---

# EXECUTIVE SUMMARY

The Triton Construction AI Platform is a comprehensive, production-ready construction operations system built on Supabase (PostgreSQL) with a React web application. The platform covers the complete construction lifecycle from bidding through project closeout with AI-powered intelligence throughout.

**Platform Statistics:**
- **Total Migrations:** 130
- **Total Database Tables:** 100+
- **Total Views:** 40+
- **Total Edge Functions:** 61
- **Web Application Pages:** 85+
- **Row Level Security:** Enabled on ALL tables
- **Audit Logging:** Automatic on all user-modifiable data

---

# PART 1: PLATFORM ARCHITECTURE

## 1.1 Supabase Project

**Project Reference:** `gablgsruyuhvjurhtcxx`
**Project URL:** `https://gablgsruyuhvjurhtcxx.supabase.co`

### Credentials (SECURE THESE)

```
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYmxnc3J1eXVodmp1cmh0Y3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDY3OTUsImV4cCI6MjA4MDUyMjc5NX0.nHQONhNgmXxThXUfgGa1p4HTfr43tShAGgenxej74uI

Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYmxnc3J1eXVodmp1cmh0Y3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0Njc5NSwiZXhwIjoyMDgwNTIyNzk1fQ.3gmXsKaWtBuQTSR2Rt_2A-oVqrjvIjQ3-LQFr7ONniA
```

**CRITICAL:**
- Anon Key = Safe for client-side (browser/mobile)
- Service Role Key = Server-side ONLY, never expose to clients

### Direct Database Connection
```
Host: db.gablgsruyuhvjurhtcxx.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: jxMgJNMvMwABzE6D
```

---

## 1.2 Technology Stack

### Backend
- **Database:** PostgreSQL (Supabase hosted)
- **API:** Supabase Auto-generated REST API + Edge Functions
- **Auth:** Supabase Auth (JWT-based)
- **Storage:** Supabase Storage (S3-compatible)
- **Edge Functions:** Deno runtime

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **State Management:** React Query + Context
- **Styling:** CSS with CSS Variables (dark theme)
- **Maps:** Mapbox GL JS

### AI/ML Services
- **Document Analysis:** Claude API (Anthropic)
- **Voice Transcription:** OpenAI Whisper
- **OCR:** Google Document AI
- **Embeddings:** OpenAI text-embedding-ada-002

---

# PART 2: COMPLETE MODULE INVENTORY

## 2.1 Core Foundation (Migrations 001-009)

### Tables
| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant company root |
| `user_profiles` | Extended user data |
| `permissions` | Granular permission definitions (44 seeded) |
| `roles` | Role definitions with hierarchy (6 seeded) |
| `role_permissions` | Role-to-permission mappings |
| `user_roles` | User-to-role assignments |
| `audit_logs` | Immutable change log |
| `auth_events` | Login/logout tracking |
| `api_access_logs` | API request tracking |

### System Roles
| Role | Level | Description |
|------|-------|-------------|
| ADMIN | 1 | Full system access |
| EXECUTIVE | 10 | Read all, limited write |
| PROJECT_MANAGER | 20 | Full project access |
| SUPERINTENDENT | 30 | Field operations lead |
| FOREMAN | 40 | Crew management |
| FIELD_USER | 50 | Basic data entry |

---

## 2.2 Project Management (Migrations 002, 067-078)

### Tables
| Table | Purpose |
|-------|---------|
| `projects` | Construction projects with WVDOH fields |
| `project_assignments` | User-to-project access |
| `project_locations` | Geofenced boundaries |
| `cost_codes` | Cost code hierarchy |
| `project_phases` | Milestones and schedule |
| `project_contacts` | External contacts |

### Key Features
- WVDOH compliance fields (contract_number, federal_aid_number, district)
- Davis-Bacon tracking (is_federal_aid, davis_bacon_required)
- DBE goal percentage tracking
- Working days management
- Contract value tracking

---

## 2.3 Bid Intelligence Platform (Migrations 010-023, 048, 096-103)

### Tables
| Table | Purpose |
|-------|---------|
| `bid_projects` | Bid opportunities |
| `bid_documents` | Uploaded bid documents |
| `bid_line_items` | Proposal line items with quantities |
| `bid_risks` | AI-extracted project risks |
| `bid_questions` | Pre-bid questions |
| `bid_team_members` | Estimating team assignments |
| `bid_work_packages` | Work breakdown packages |
| `bid_executive_snapshots` | AI-generated executive summaries |
| `master_wvdoh_items` | WVDOH master item catalog |
| `historical_bid_results` | Past bid pricing data |
| `assembly_templates` | Standard item assemblies |
| `spec_documents` | Specification knowledge base |
| `spec_embeddings` | AI embeddings for spec search |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `parse-bidx` | Parse WVDOH EBSX files |
| `parse-xlsx-bid` | Parse Excel bid tabs |
| `analyze-bid-document` | AI document analysis |
| `extract-bid-metadata` | Extract project metadata |
| `extract-project-risks` | AI risk identification |
| `generate-prebid-questions` | AI question generation |
| `generate-executive-snapshot` | AI executive summary |
| `generate-work-packages` | Auto-create work packages |
| `categorize-line-items` | AI item categorization |
| `upload-bid-document` | Document upload handler |
| `validate-bid-submission` | Submission validation |
| `send-bid-deadline-notifications` | Deadline alerts |

### Web Pages
- `BidList.tsx` - Bid project listing
- `BidDetail.tsx` - Full bid management (8 tabs)
- `CreateBid.tsx` - New bid creation
- `BidCommandCenter.tsx` - Intelligence dashboard

### Components
- `LineItemsTab.tsx` - Line item management with pricing
- `DocumentsTab.tsx` - Document management
- `RisksTab.tsx` - Risk tracking
- `QuestionsTab.tsx` - Pre-bid questions
- `WorkPackagesTab.tsx` - Work package management
- `TeamTab.tsx` - Team assignments
- `ExecutiveHandoffModal.tsx` - Executive briefing export
- `BidTrafficMap.tsx` - Geographic visualization
- `DeadlineAlertBanner.tsx` - Deadline warnings
- `SubmissionChecklistModal.tsx` - Go/no-go checklist

---

## 2.4 WV811 Locate Ticket Management (Migrations 036-047, 119-121)

### Tables
| Table | Purpose |
|-------|---------|
| `wv811_tickets` | Locate ticket records |
| `wv811_ticket_history` | Ticket status changes |
| `wv811_utility_responses` | Utility company responses |
| `wv811_alerts` | Alert notifications |
| `wv811_compliance_reports` | Compliance tracking |
| `wv811_proximity_alerts` | GPS proximity warnings |
| `geocode_queue` | Address geocoding queue |
| `user_push_tokens` | Mobile push notification tokens |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `wv811-email-ingest` | Email webhook receiver |
| `wv811-email-parse` | AI email parsing |
| `wv811-ticket-expire` | Expiration processing |
| `wv811-draft-renewal` | Auto-renewal drafts |
| `wv811-draft-followup` | Follow-up drafts |
| `wv811-emergency-notify` | Emergency alerts |
| `wv811-alert-process` | Alert processing |
| `wv811-daily-radar` | Daily status report |
| `wv811-compliance-report` | Compliance reports |
| `wv811-audit-pack-export` | Audit package export |
| `wv811-offline-sync` | Offline data sync |
| `wv811-weekly-report` | Weekly summaries |
| `wv811-high-risk-alert` | High-risk proximity alerts |
| `geocode-ticket` | Address geocoding |
| `process-geocode-queue` | Batch geocoding |
| `send-push-notification` | Mobile push notifications |

### Web Pages
- `LocateTicketsPage.tsx` - Ticket listing with filters
- `TicketDetail.tsx` - Full ticket management
- `TicketMapPage.tsx` - Geographic ticket view
- `DailyRadarPage.tsx` - Daily status dashboard
- `DigCheckPage.tsx` - Field dig verification
- `AnalyticsDashboard.tsx` - Ticket analytics
- `AlertSettingsPage.tsx` - Alert configuration

### Features
- Automatic email parsing from WV811
- GPS-based proximity alerts
- Utility response tracking
- Compliance documentation
- Mobile push notifications
- Offline-capable architecture

---

## 2.5 Safety Management (Migrations 050, 079, 114, 130)

### Tables
| Table | Purpose |
|-------|---------|
| `toolbox_talks` | Safety meeting records |
| `toolbox_talk_attendees` | Meeting attendance |
| `job_safety_analysis` | JSA/JHA documents |
| `incidents` | Accident/injury reports |
| `safety_violations` | OSHA violation tracking |
| `safety_orientations` | New hire orientations |
| `safety_metrics` | TRIR, DART, EMR tracking |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `analyze-incident` | AI incident analysis |
| `generate-jsa` | AI JSA generation |
| `generate-osha-300-log` | OSHA 300 log generation |

### Web Pages
- `SafetyDashboard.tsx` - Safety KPIs and overview
- `IncidentReportPage.tsx` - Incident reporting
- `JSAManagement.tsx` - JSA management
- `ToolboxTalkLog.tsx` - Toolbox talk tracking

### Key Metrics
- TRIR (Total Recordable Incident Rate)
- DART (Days Away, Restricted, Transfer)
- EMR (Experience Modification Rate)
- Hours worked tracking
- Violation tracking

---

## 2.6 Crew & Equipment Management (Migrations 003, 049, 051, 087-091)

### Tables
| Table | Purpose |
|-------|---------|
| `crew_members` | Field workers with EEO data |
| `crew_certifications` | OSHA, CDL certifications |
| `employees` | Full employee records |
| `equipment` | Fleet inventory |
| `equipment_assignments` | Equipment-to-project |
| `vehicles` | Vehicle fleet |
| `vehicle_inspections` | DVIR records |
| `fuel_transactions` | Fuel tracking |
| `driver_qualifications` | DQF compliance |
| `operator_qualifications` | Equipment operator certs |

### Web Pages
- `EquipmentFleetDashboard.tsx` - Fleet overview
- `MaintenanceDashboard.tsx` - Maintenance scheduling
- `FleetInspections.tsx` - Inspection management
- `VehicleDetails.tsx` - Vehicle details
- `EnhancedVehicleDetails.tsx` - Extended vehicle view
- `FuelManagement.tsx` - Fuel tracking
- `FuelManagementDashboard.tsx` - Fuel analytics
- `FleetAnalyticsDashboard.tsx` - Fleet analytics
- `FleetReports.tsx` - Fleet reporting
- `IFTAReporting.tsx` - IFTA tax reporting
- `EnhancedIFTAReporting.tsx` - Enhanced IFTA
- `DQFManagement.tsx` - Driver qualification files
- `EnhancedDQFManagement.tsx` - Enhanced DQF
- `OperatorQualifications.tsx` - Operator certs
- `CrewRoster.tsx` - Crew management
- `EnhancedCrewRoster.tsx` - Enhanced crew view

---

## 2.7 Materials & OCR (Migrations 053, 080, 115)

### Tables
| Table | Purpose |
|-------|---------|
| `purchase_orders` | PO management |
| `po_line_items` | PO details |
| `material_tickets` | Delivery tickets |
| `material_ticket_items` | Ticket line items |
| `ocr_extractions` | OCR processing results |
| `material_reconciliation` | PO-to-delivery matching |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `ocr-process` | OCR ticket extraction |
| `ocr-process-enhanced` | Enhanced OCR |
| `ocr-batch-process` | Batch OCR processing |
| `analyze-photo` | AI photo analysis |
| `analyze-photos-batch` | Batch photo analysis |

### Web Pages
- `MaterialsDashboard.tsx` - Materials overview
- `EnhancedMaterialsDashboard.tsx` - Enhanced view
- `MaterialTicketViewer.tsx` - Ticket viewing
- `POManagement.tsx` - Purchase order management

---

## 2.8 Quality Control (Migrations 054, 081)

### Tables
| Table | Purpose |
|-------|---------|
| `inspections` | QC inspection records |
| `inspection_items` | Inspection checklist items |
| `test_results` | Lab/field test results |
| `non_conformances` | NCR tracking |
| `punch_list_items` | Punch list management |
| `hold_points` | ITP hold points |

### Web Pages
- `QualityControlDashboard.tsx` - QC overview
- `InspectionManagement.tsx` - Inspection management
- `NCRTracker.tsx` - Non-conformance tracking
- `PunchListManager.tsx` - Punch list management

---

## 2.9 Time Tracking & Payroll (Migrations 005, 052, 092, 117)

### Tables
| Table | Purpose |
|-------|---------|
| `pay_periods` | Payroll periods |
| `time_entries` | Individual time records |
| `prevailing_wage_rates` | Davis-Bacon wage rates |
| `certified_payrolls` | WH-347 payroll records |
| `certified_payroll_lines` | Employee payroll lines |

### Web Pages
- `TimeTrackingDashboard.tsx` - Time overview
- `TimeEntryPage.tsx` - Time entry
- `TimesheetApproval.tsx` - Approval workflow
- `WeeklyTimesheet.tsx` - Weekly view

---

## 2.10 Pay Estimates & Self-Perform (Migrations 067-078, 125-126)

### Tables
| Table | Purpose |
|-------|---------|
| `pay_periods` (extended) | Pay estimate periods |
| `pay_estimate_lines` | Estimate line items |
| `self_perform_cost_codes` | Self-perform tracking |
| `self_perform_labor_entries` | Labor cost entries |
| `self_perform_equipment_entries` | Equipment cost entries |
| `self_perform_material_entries` | Material cost entries |
| `aashtoware_exports` | CRL export records |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `crl-export` | AASHTOWare CRL export |
| `pay-period-ingest` | Pay period import |

### Web Pages
- `PayEstimateDashboard.tsx` - Pay estimate overview
- `PayPeriodDetail.tsx` - Period details
- `ValidationDashboard.tsx` - Validation rules
- `PayEstimateUpload.tsx` - Upload interface
- `SubcontractorWorksheet.tsx` - Sub worksheets
- `ComplianceDashboard.tsx` - Compliance tracking
- `SelfPerformDashboard.tsx` - Self-perform tracking

---

## 2.11 Compliance & Davis-Bacon (Migrations 070-073, 112-113)

### Tables
| Table | Purpose |
|-------|---------|
| `compliance_rules` | Compliance rule definitions |
| `compliance_violations` | Violation tracking |
| `dbe_participation` | DBE utilization |

### Web Pages
- `CertifiedPayrollDashboard.tsx` - Certified payroll
- `WageRateManagement.tsx` - Wage rate management
- `WorkforceComplianceDashboard.tsx` - Workforce compliance

---

## 2.12 Subcontractor Management (Migrations 055, 083)

### Tables
| Table | Purpose |
|-------|---------|
| `subcontractors` | Sub company records |
| `subcontractor_insurance` | Insurance tracking |
| `subcontractor_contacts` | Sub contacts |
| `subcontractor_work_items` | Work assignments |

### Web Pages
- `SubcontractorDashboard.tsx` - Sub overview
- `EnhancedSubcontractorDashboard.tsx` - Enhanced view

---

## 2.13 Change Orders & RFIs (Migrations 057-058)

### Tables
| Table | Purpose |
|-------|---------|
| `change_orders` | Change order records |
| `change_order_items` | CO line items |
| `rfis` | Request for information |
| `rfi_responses` | RFI responses |

### Web Pages
- `ChangeOrderDashboard.tsx` - CO management
- `EnhancedChangeOrderDashboard.tsx` - Enhanced CO view
- `RFIDashboard.tsx` - RFI management
- `EnhancedRFIDashboard.tsx` - Enhanced RFI view

---

## 2.14 Document Management (Migrations 056)

### Tables
| Table | Purpose |
|-------|---------|
| `documents` | Project documents |
| `document_versions` | Version history |
| `document_tags` | Document tagging |

### Web Pages
- `DocumentDashboard.tsx` - Document overview
- `EnhancedDocumentCenter.tsx` - Enhanced document center

---

## 2.15 AI & Analytics (Migrations 059-060)

### Tables
| Table | Purpose |
|-------|---------|
| `ai_queries` | AI query history |
| `ai_responses` | AI response cache |
| `predictive_alerts` | Predictive alert records |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `ai-query` | Natural language queries |
| `spec-query` | Specification search |
| `generate-spec-embeddings` | Spec embeddings |
| `suggest-cost-code-mapping` | AI cost code suggestions |

### Web Pages
- `AIQueryPage.tsx` - AI query interface
- `PredictiveAnalyticsDashboard.tsx` - Predictive analytics
- `EnhancedPredictiveAnalytics.tsx` - Enhanced analytics

---

## 2.16 Daily Reports (Migration 004)

### Tables
| Table | Purpose |
|-------|---------|
| `daily_reports` | Daily report records |
| `daily_report_entries` | Work activities |
| `voice_recordings` | Audio recordings |
| `report_photos` | GPS-tagged photos |
| `weather_snapshots` | Weather data |
| `daily_manpower` | Manpower tracking |
| `daily_equipment_log` | Equipment hours |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `voice-transcribe` | Whisper transcription |
| `daily-report-generate` | AI report generation |
| `weather-fetch` | Weather API |
| `report-finalize` | Report finalization |

### Web Pages
- `VoiceDailyReportPage.tsx` - Voice-first reporting

---

## 2.17 Training & Certification (Migrations 061-064)

### Tables
| Table | Purpose |
|-------|---------|
| `training_courses` | Course definitions |
| `training_sessions` | Session records |
| `training_enrollments` | Enrollment tracking |
| `certifications` | Certification records |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `complete-training-session` | Session completion |
| `validate-crew-assignment` | Cert validation |
| `daily-brief-submit` | Daily brief submission |

### Web Pages
- `TrainingDashboard.tsx` - Training overview
- `MyCertifications.tsx` - Personal certifications

---

## 2.18 Notifications & Alerts (Migrations 102-103, 121)

### Tables
| Table | Purpose |
|-------|---------|
| `notifications` | Notification records |
| `notification_preferences` | User preferences |
| `user_push_tokens` | Push notification tokens |

### Edge Functions
| Function | Purpose |
|----------|---------|
| `process-notifications` | Notification processing |
| `send-push-notification` | Push delivery |
| `email-send` | Email delivery |
| `sms-send` | SMS delivery |
| `emergency-override` | Emergency bypass |

### Web Pages
- `PlatformAlertsDashboard.tsx` - Alert management
- `EnhancedPlatformAlerts.tsx` - Enhanced alerts

---

## 2.19 Additional Modules

### Geofencing
- `GeofenceManagement.tsx` - Geofence management
- `EnhancedGeofenceManagement.tsx` - Enhanced geofencing

### Cost Codes
- `CostCodeManagement.tsx` - Cost code management

### Specifications
- `SpecsPage.tsx` - Spec knowledge base

### Executive
- `ExecutiveDashboard.tsx` - Executive overview

---

# PART 3: EDGE FUNCTIONS COMPLETE INVENTORY

## 3.1 All 61 Edge Functions

### Bidding (12 functions)
```
analyze-bid-document     extract-bid-metadata
extract-project-risks    generate-executive-snapshot
generate-prebid-questions generate-work-packages
parse-bidx               parse-xlsx-bid
categorize-line-items    upload-bid-document
validate-bid-submission  send-bid-deadline-notifications
```

### WV811 Locate Tickets (16 functions)
```
wv811-email-ingest       wv811-email-parse
wv811-ticket-expire      wv811-draft-renewal
wv811-draft-followup     wv811-emergency-notify
wv811-alert-process      wv811-daily-radar
wv811-compliance-report  wv811-audit-pack-export
wv811-offline-sync       wv811-weekly-report
wv811-high-risk-alert    geocode-ticket
process-geocode-queue    send-push-notification
```

### Safety (3 functions)
```
analyze-incident         generate-jsa
generate-osha-300-log
```

### Materials & OCR (5 functions)
```
ocr-process              ocr-process-enhanced
ocr-batch-process        analyze-photo
analyze-photos-batch
```

### Specs & AI (4 functions)
```
ai-query                 spec-query
generate-spec-embeddings suggest-cost-code-mapping
parse-spec-pdf
```

### Pay Estimates (2 functions)
```
crl-export               pay-period-ingest
```

### Daily Reports (4 functions)
```
voice-transcribe         daily-report-generate
weather-fetch            report-finalize
```

### Training (3 functions)
```
complete-training-session validate-crew-assignment
daily-brief-submit
```

### Notifications (4 functions)
```
process-notifications    email-send
sms-send                emergency-override
```

### Compliance (2 functions)
```
certified-payroll-generate dbe-report-generate
```

### Sync & Queue (3 functions)
```
batch-sync-download      batch-sync-upload
process-document-queue
```

### Auth (1 function)
```
signup
```

---

# PART 4: WEB APPLICATION STRUCTURE

## 4.1 Page Inventory (85+ Pages)

### Authentication
- `Login.tsx`
- `Signup.tsx`

### Dashboard
- `Dashboard.tsx` - Main dashboard

### Bidding
- `BidList.tsx`
- `BidDetail.tsx` (8 tabs)
- `CreateBid.tsx`
- `BidCommandCenter.tsx`

### WV811 Locate Tickets
- `LocateTicketsPage.tsx`
- `TicketDetail.tsx`
- `TicketMapPage.tsx`
- `DailyRadarPage.tsx`
- `DigCheckPage.tsx`
- `AnalyticsDashboard.tsx`
- `AlertSettingsPage.tsx`

### Safety
- `SafetyDashboard.tsx`
- `IncidentReportPage.tsx`
- `JSAManagement.tsx`
- `ToolboxTalkLog.tsx`

### Equipment & Fleet
- `EquipmentFleetDashboard.tsx`
- `MaintenanceDashboard.tsx`
- `MaintenanceScheduling.tsx`
- `FleetInspections.tsx`
- `VehicleDetails.tsx`
- `EnhancedVehicleDetails.tsx`
- `FuelManagement.tsx`
- `FuelManagementDashboard.tsx`
- `FleetAnalyticsDashboard.tsx`
- `FleetReports.tsx`
- `IFTAReporting.tsx`
- `EnhancedIFTAReporting.tsx`
- `DQFManagement.tsx`
- `EnhancedDQFManagement.tsx`
- `OperatorQualifications.tsx`
- `CrewRoster.tsx`
- `EnhancedCrewRoster.tsx`
- `VehicleInspections.tsx`

### Materials
- `MaterialsDashboard.tsx`
- `EnhancedMaterialsDashboard.tsx`
- `MaterialTicketViewer.tsx`
- `POManagement.tsx`

### Quality Control
- `QualityControlDashboard.tsx`
- `InspectionManagement.tsx`
- `NCRTracker.tsx`
- `PunchListManager.tsx`

### Time Tracking
- `TimeTrackingDashboard.tsx`
- `TimeEntryPage.tsx`
- `TimesheetApproval.tsx`
- `WeeklyTimesheet.tsx`

### Pay Estimates
- `PayEstimateDashboard.tsx`
- `PayPeriodDetail.tsx`
- `ValidationDashboard.tsx`
- `PayEstimateUpload.tsx`
- `SubcontractorWorksheet.tsx`
- `ComplianceDashboard.tsx`
- `SelfPerformDashboard.tsx`

### Compliance
- `CertifiedPayrollDashboard.tsx`
- `WageRateManagement.tsx`
- `WorkforceComplianceDashboard.tsx`

### Subcontractors
- `SubcontractorDashboard.tsx`
- `EnhancedSubcontractorDashboard.tsx`

### Change Orders & RFIs
- `ChangeOrderDashboard.tsx`
- `EnhancedChangeOrderDashboard.tsx`
- `RFIDashboard.tsx`
- `EnhancedRFIDashboard.tsx`

### Documents
- `DocumentDashboard.tsx`
- `EnhancedDocumentCenter.tsx`

### AI & Analytics
- `AIQueryPage.tsx`
- `PredictiveAnalyticsDashboard.tsx`
- `EnhancedPredictiveAnalytics.tsx`

### Training
- `TrainingDashboard.tsx`
- `MyCertifications.tsx`

### Daily Reports
- `VoiceDailyReportPage.tsx`

### Projects
- `ProjectDashboard.tsx`

### Alerts & Geofencing
- `PlatformAlertsDashboard.tsx`
- `EnhancedPlatformAlerts.tsx`
- `GeofenceManagement.tsx`
- `EnhancedGeofenceManagement.tsx`

### Admin
- `AdminDashboard.tsx`
- `UserManagement.tsx`
- `RoleAccessControl.tsx`
- `DocumentManagement.tsx`
- `AssignmentRulesAdmin.tsx`

### Settings
- `OrganizationSettings.tsx`
- `CostCodeManagement.tsx`

### Executive
- `ExecutiveDashboard.tsx`

### Specs
- `SpecsPage.tsx`

---

## 4.2 Component Library

### Bid Components (`/components/bids/`)
- `LineItemsTab.tsx` - Line item grid with pricing
- `LineItemDetail.tsx` - Item detail panel
- `DocumentsTab.tsx` - Document management
- `RisksTab.tsx` - Risk tracking
- `QuestionsTab.tsx` - Question management
- `WorkPackagesTab.tsx` - Work package builder
- `TeamTab.tsx` - Team assignments
- `ExecutiveHandoffModal.tsx` - Executive briefing
- `BidTrafficMap.tsx` - Geographic view
- `DeadlineAlertBanner.tsx` - Deadline warnings
- `SubmissionChecklistModal.tsx` - Submission checklist
- `DeleteProjectModal.tsx` - Project deletion
- `VarianceAlert.tsx` - Quantity variance alerts
- `UnbalanceModal.tsx` - Bid unbalancing

### Locate Ticket Components (`/components/locate-tickets/`)
- `TicketMap.tsx` - Map visualization
- `TicketCard.tsx` - Ticket card
- `TicketFilters.tsx` - Filter controls
- `ProximityAlertBanner.tsx` - Proximity warnings

### Safety Components (`/components/safety/`)
- `SafetyMetricsCard.tsx`
- `IncidentForm.tsx`
- `JSACard.tsx`

### Other Components
- `Layout.tsx` - App layout
- `ProtectedRoute.tsx` - Auth protection
- `AdminRoute.tsx` - Admin protection
- `DocumentList.tsx` - Document listing
- `DocumentUpload.tsx` - Upload interface

---

# PART 5: DATABASE SCHEMA REFERENCE

## 5.1 Key Enums

```sql
-- Project status
CREATE TYPE project_status_enum AS ENUM (
  'PLANNING', 'BIDDING', 'AWARDED', 'MOBILIZATION',
  'ACTIVE', 'SUBSTANTIAL_COMPLETION', 'PUNCH_LIST',
  'COMPLETE', 'CLOSED'
);

-- Bid status
CREATE TYPE bid_status_enum AS ENUM (
  'IDENTIFIED', 'REVIEWING', 'PURSUING', 'ESTIMATING',
  'SUBMITTED', 'WON', 'LOST', 'NO_BID', 'ARCHIVED'
);

-- Document processing status
CREATE TYPE document_processing_status AS ENUM (
  'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
);

-- Incident classification
CREATE TYPE incident_classification_enum AS ENUM (
  'near_miss', 'first_aid_only', 'recordable_injury',
  'lost_time', 'fatality'
);

-- WV811 ticket status
CREATE TYPE wv811_status_enum AS ENUM (
  'PENDING', 'ACTIVE', 'EXPIRED', 'RENEWED', 'CLOSED'
);
```

## 5.2 Key Relationships

```
organizations
  └── projects
        ├── bid_projects
        │     ├── bid_documents
        │     ├── bid_line_items
        │     ├── bid_risks
        │     └── bid_questions
        ├── daily_reports
        ├── time_entries
        ├── pay_periods
        └── wv811_tickets
  └── crew_members
  └── equipment
  └── subcontractors
```

---

# PART 6: SECURITY MODEL

## 6.1 Row Level Security

**Every table has RLS enabled.** Key patterns:

1. **Organization Isolation**
   - Users only see data in their organization
   - `organization_id = public.get_user_organization_id()`

2. **Project-Based Access**
   - Users see projects they're assigned to
   - Executives/Admins see all projects in org

3. **Role-Based Permissions**
   - Permission checks via `user_has_permission()`
   - Role level checks via `get_user_role_level()`

## 6.2 Demo Mode RLS

For demonstration purposes, tables have additional policies allowing read access when:
- User email ends with `@triton.com`
- Data belongs to the demo organization

---

# PART 7: API REFERENCE

## 7.1 Supabase REST API

Base URL: `https://gablgsruyuhvjurhtcxx.supabase.co/rest/v1`

### Authentication Header
```
apikey: [ANON_KEY or SERVICE_ROLE_KEY]
Authorization: Bearer [JWT_TOKEN]
```

### Example Queries
```bash
# Get bid projects
curl -s "https://gablgsruyuhvjurhtcxx.supabase.co/rest/v1/bid_projects?select=*&limit=10" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY"

# Get line items for a project
curl -s "https://gablgsruyuhvjurhtcxx.supabase.co/rest/v1/bid_line_items?bid_project_id=eq.UUID&select=*" \
  -H "apikey: $API_KEY" \
  -H "Authorization: Bearer $API_KEY"
```

## 7.2 Edge Function Invocation

```typescript
// Client-side
const { data, error } = await supabase.functions.invoke('parse-bidx', {
  body: { documentId: 'uuid', bidProjectId: 'uuid' }
});

// Server-side with service role
const response = await fetch(
  'https://gablgsruyuhvjurhtcxx.supabase.co/functions/v1/parse-bidx',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ documentId, bidProjectId })
  }
);
```

---

# PART 8: ENVIRONMENT VARIABLES

## 8.1 Required Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://gablgsruyuhvjurhtcxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# For Edge Functions
SUPABASE_URL=https://gablgsruyuhvjurhtcxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# External APIs
GOOGLE_CLOUD_API_KEY=...
MAPBOX_ACCESS_TOKEN=pk....
OPENWEATHERMAP_API_KEY=...
```

---

# PART 9: DEVELOPMENT GUIDELINES

## 9.1 Code Standards

### TypeScript
- Strict mode enabled
- No implicit any
- Proper null checks

### Naming Conventions
- Tables: `snake_case`, plural (`bid_projects`)
- Columns: `snake_case` (`created_at`)
- Functions: `snake_case` (`get_user_projects`)
- TypeScript: `camelCase` for variables, `PascalCase` for types
- Components: `PascalCase` (`BidDetail.tsx`)

## 9.2 Git Workflow

```
main → Production
```

### Commit Format
```
type(scope): description

feat(bids): add quantity intelligence
fix(safety): correct TRIR calculation
```

---

# PART 10: FUTURE ROADMAP

## 10.1 Phase 4 Features (Planned)

### Mobile Application
- React Native + Expo
- Offline-first architecture
- Voice recording
- Photo capture with GPS
- Push notifications (infrastructure ready)

### Enhanced AI
- Claude-powered project insights
- Predictive cost modeling
- Automated report generation

### Integrations
- CAT Product Link (telematics)
- John Deere JDLink
- Heavy Job import/export
- Viewpoint integration

### Advanced Reporting
- Custom report builder
- Scheduled report delivery
- Executive dashboard enhancements

---

# APPENDIX A: MIGRATION INVENTORY

## Complete Migration List (130 total)

```
001_foundation_schema.sql          - Core identity & auth
002_projects_schema.sql            - Project management
003_crew_equipment_schema.sql      - Crew & equipment
004_daily_reports_schema.sql       - Daily reports
005_time_tracking_schema.sql       - Time tracking
009_fix_audit_trigger.sql          - Audit fixes
010_bid_package_core.sql           - Bid core tables
011_intelligence_layer.sql         - AI layer
012_environmental_hazmat.sql       - Environmental
013_phasing_work_packages.sql      - Work packages
014_deliverables_learning.sql      - Deliverables
015_estimation_enums.sql           - Estimation enums
016_alter_line_items.sql           - Line item changes
017_alter_risks.sql                - Risk changes
018_assembly_templates.sql         - Assembly templates
019_item_assemblies.sql            - Item assemblies
020_pricing_scenarios.sql          - Pricing scenarios
021_join_tables.sql                - Join tables
022_audit_tables.sql               - Audit tables
023_addendum_views.sql             - Addendum views
024_storage_buckets.sql            - Storage buckets
025_seed_wvdoh_items.sql           - WVDOH items
026_spec_knowledge_base.sql        - Spec KB
027_spec_storage_bucket.sql        - Spec storage
028_spec_storage_policies.sql      - Spec policies
029_fix_rls_recursion.sql          - RLS fixes
030_simpler_rls_fix.sql            - RLS simplification
031_role_access_control.sql        - Role access
032_fix_role_access_rls.sql        - Role RLS fixes
033_fix_organizations_rls.sql      - Org RLS
034_fix_organizations_update.sql   - Org updates
035_fix_spec_documents_schema.sql  - Spec docs
036_wv811_tickets.sql              - WV811 tickets
037_wv811_enhancements.sql         - WV811 enhancements
038_utility_response_tracker.sql   - Utility responses
039_fix_wv811_rls_policies.sql     - WV811 RLS
040_ai_ready_photo_storage.sql     - Photo storage
041_setup_wv811_storage_bucket.sql - WV811 storage
042_emergency_draft_email.sql      - Emergency email
043_sms_logs.sql                   - SMS logging
044_ai_analysis_confirmation.sql   - AI confirmation
045_geocoding_support.sql          - Geocoding
046_fix_wv811_updated_by.sql       - WV811 fixes
047_email_logs.sql                 - Email logs
048_bid_intelligence.sql           - Bid intelligence
049_workforce_employees.sql        - Workforce
050_safety_incidents.sql           - Safety incidents
051_fleet_driver_qualification.sql - DQF
052_crew_builder_davis_bacon.sql   - Davis-Bacon
053_material_tickets_revenue.sql   - Materials
054_quality_control.sql            - Quality control
055_subcontractor_management.sql   - Subcontractors
056_document_management.sql        - Documents
057_change_orders.sql              - Change orders
058_rfi_management.sql             - RFIs
059_ai_query_infrastructure.sql    - AI queries
060_predictive_analytics.sql       - Analytics
061_training_certification.sql     - Training
062_daily_brief_validation.sql     - Daily brief
063_self_service_rls.sql           - Self-service RLS
064_employee_self_service.sql      - Employee self-service
065_sandbox_seed_data.sql          - Seed data
066_sandbox_bid_equipment.sql      - Bid/equipment seed
066a_add_enum_values.sql           - Enum values
066b_insert_sandbox_data.sql       - Sandbox data
067_pay_estimate_core.sql          - Pay estimates
068_handoff_access_control.sql     - Handoff access
069_budget_tracking.sql            - Budget tracking
070_compliance_engine.sql          - Compliance
071_advanced_rls_policies.sql      - Advanced RLS
072_pay_estimate_views.sql         - PE views
073_pay_estimate_validation.sql    - PE validation
074_pay_estimate_storage.sql       - PE storage
075_self_perform_cost_tracking.sql - Self-perform
076_aashtoware_crl_export.sql      - CRL export
077_daily_report_pay_integration.sql - DR integration
078_self_perform_seed_data.sql     - Self-perform seed
079_safety_advanced.sql            - Advanced safety
080_materials_advanced.sql         - Advanced materials
081_quality_advanced.sql           - Advanced quality
082_advanced_modules_seed.sql      - Module seed data
083_subcontractor_seed_data.sql    - Sub seed
084_add_missing_columns.sql        - Missing columns
085_comprehensive_columns.sql      - Comprehensive columns
086_platform_core.sql              - Platform core
087_equipment_crew_mgmt.sql        - Equipment/crew
088_fix_crew_constraints.sql       - Crew constraints
089_equipment_crew_seed.sql        - Equipment seed
090_vehicle_fleet_mgmt.sql         - Vehicle fleet
091_vehicle_fleet_seed.sql         - Vehicle seed
092_time_tracking_seed.sql         - Time seed
093_modules_seed_data.sql          - Module seeds
094_demo_rls_policies.sql          - Demo RLS
095_update_seed_dates.sql          - Date updates
096_bid_document_ai_analysis.sql   - AI analysis
097_auto_process_documents.sql     - Auto processing
098_bid_intelligence_fixes.sql     - BI fixes
099_bid_module_seed.sql            - Bid seed
100_fix_line_items_seed.sql        - Line item seed
101_pricing_validation.sql         - Price validation
102_notification_system.sql        - Notifications
103_bid_deadline_cron.sql          - Deadline cron
104_wvdoh_document_types.sql       - Doc types
105_add_ebsx_mime_type.sql         - EBSX mime
106_historical_pricing.sql         - Historical pricing
107_pricing_engine.sql             - Pricing engine
108_assembly_template_seed.sql     - Assembly seed
109_fix_item_normalization.sql     - Item normalization
110_comprehensive_wvdoh_seed.sql   - WVDOH seed
111_fix_ls_items_variants.sql      - LS items
112_compliance_violations.sql      - Violations
113_equipment_operator_blocking.sql - Operator blocking
114_safety_enhancements.sql        - Safety enhancements
115_ocr_enhancements.sql           - OCR enhancements
116_populate_wvdoh_prices.sql      - WVDOH prices
117_davis_bacon_completion.sql     - Davis-Bacon
118_offline_sync_infrastructure.sql - Offline sync
119_wv811_high_risk_proximity.sql  - High risk
120_auto_geocode_trigger.sql       - Auto geocode
121_user_push_tokens.sql           - Push tokens
122_fix_projects_rls.sql           - Projects RLS
123_fix_projects_rls_v2.sql        - Projects RLS v2
124_fix_all_demo_rls.sql           - Demo RLS
125_self_perform_demo_data.sql     - Self-perform demo
126_daily_reports_time_entries.sql - DR/time entries
127_quantity_intelligence.sql      - Quantity intelligence
128_fix_bid_intelligence_rls.sql   - BI RLS
129_fix_dashboard_view_totals.sql  - Dashboard totals
130_safety_comprehensive_seed.sql  - Safety seed
```

---

# APPENDIX B: SUPPORT RESOURCES

## Documentation Links

- Supabase Docs: https://supabase.com/docs
- React: https://react.dev
- Vite: https://vitejs.dev
- Claude API: https://docs.anthropic.com
- Mapbox GL JS: https://docs.mapbox.com/mapbox-gl-js

## Supabase Dashboard

- Dashboard: https://supabase.com/dashboard/project/gablgsruyuhvjurhtcxx
- SQL Editor: Dashboard → SQL Editor
- Table Editor: Dashboard → Table Editor
- Edge Functions: Dashboard → Edge Functions
- Storage: Dashboard → Storage
- Logs: Dashboard → Logs

## Project Contacts

- **Project Owner:** Brian T. Lewis (brian@redexllc.com)
- **Primary Client:** Triton Construction, Inc., St. Albans, WV

---

*Document last updated: December 14, 2025*
*Current migration: 130_safety_comprehensive_seed_data.sql*
*Total edge functions: 61*
*Total web pages: 85+*
