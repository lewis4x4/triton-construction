# WV811 Locate Ticket Management System
## Complete Training Guide & Technical Documentation

**Version:** 1.0
**Last Updated:** December 6, 2024
**Platform:** Triton Construction AI Platform

---

# Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture & Components](#2-architecture--components)
3. [Ticket Lifecycle](#3-ticket-lifecycle)
4. [User Interface Modules](#4-user-interface-modules)
5. [Field Operations Workflow](#5-field-operations-workflow)
6. [Photo Evidence System](#6-photo-evidence-system)
7. [Alert & Notification System](#7-alert--notification-system)
8. [Mapping & Geocoding](#8-mapping--geocoding)
9. [Compliance & Reporting](#9-compliance--reporting)
10. [Database Schema](#10-database-schema)
11. [Edge Functions Reference](#11-edge-functions-reference)
12. [Troubleshooting Guide](#12-troubleshooting-guide)

---

# 1. System Overview

## What is WV811?

WV811 (West Virginia 811) is the state's "Call Before You Dig" utility locate service. Before any excavation work, contractors must:
1. Submit a locate request through WV811
2. Wait for utilities to mark their underground lines
3. Dig only within the marked safe zones
4. Document the entire process for legal protection

## What Does This System Do?

The Triton WV811 Module automates and digitizes the entire locate ticket workflow:

| Manual Process | Triton Automation |
|---------------|-------------------|
| Receive email tickets, print and file | Auto-ingest emails, AI-parse data, digital storage |
| Track deadlines on paper calendar | Automatic alerts at 48hr, 24hr, same-day |
| Drive to site to check for marks | GPS-verified photo evidence with timestamps |
| Hand-write daily progress notes | Voice-to-text daily reports |
| Call crews about expiring tickets | SMS batching with smart notifications |
| Compile evidence for disputes | One-click audit pack export |

## Key Benefits

- **Legal Protection**: GPS-tagged, timestamped photos create an evidence locker
- **Zero Missed Deadlines**: Multi-channel alerts ensure nothing expires unnoticed
- **Field Efficiency**: Mobile-first design works on job sites with poor connectivity
- **Compliance Ready**: Automated reports meet WVDOH and utility requirements
- **AI-Powered**: Claude Vision analyzes photos, Claude extracts ticket data

---

# 2. Architecture & Components

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TRITON WV811 MODULE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   WV811.org  │───▶│   SendGrid   │───▶│ Email Ingest │          │
│  │  (Tickets)   │    │  (Webhook)   │    │  Function    │          │
│  └──────────────┘    └──────────────┘    └──────┬───────┘          │
│                                                  │                  │
│                                                  ▼                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │    Claude    │◀───│  Email Parse │◀───│   Raw Email  │          │
│  │     AI       │    │   Function   │    │   Storage    │          │
│  └──────┬───────┘    └──────────────┘    └──────────────┘          │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                   SUPABASE DATABASE                   │          │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐        │          │
│  │  │  Tickets   │ │ Utilities  │ │   Photos   │        │          │
│  │  │  Table     │ │ Responses  │ │   Table    │        │          │
│  │  └────────────┘ └────────────┘ └────────────┘        │          │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐        │          │
│  │  │   Alerts   │ │  SMS Logs  │ │  Geocode   │        │          │
│  │  │   Table    │ │   Table    │ │    Log     │        │          │
│  │  └────────────┘ └────────────┘ └────────────┘        │          │
│  └──────────────────────────────────────────────────────┘          │
│                              │                                      │
│         ┌────────────────────┼────────────────────┐                │
│         ▼                    ▼                    ▼                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │    Twilio    │    │   Mapbox     │    │  Geocodio    │          │
│  │     SMS      │    │    Maps      │    │   Geocode    │          │
│  └──────────────┘    └──────────────┘    └──────────────┘          │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │                    WEB APPLICATION                    │          │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │          │
│  │  │ Ticket  │ │  Map    │ │  Photo  │ │  Daily  │     │          │
│  │  │  List   │ │  View   │ │ Upload  │ │  Radar  │     │          │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React + TypeScript + Vite | Web application |
| UI Components | Lucide Icons, Custom CSS | Interface design |
| Maps | Mapbox GL JS | Interactive mapping |
| Backend | Supabase (PostgreSQL) | Database & auth |
| Serverless | Deno Edge Functions | Business logic |
| AI | Claude (Anthropic) | Email parsing, photo analysis |
| SMS | Twilio | Text notifications |
| Geocoding | Geocodio | Address to coordinates |
| Storage | Supabase Storage | Photos, documents |

## Component Inventory

### Web Pages (5)
| Page | Path | Purpose |
|------|------|---------|
| Locate Tickets | `/locate-tickets` | Main ticket list view |
| Ticket Detail | `/locate-tickets/:id` | Single ticket view with all features |
| Ticket Map | `/locate-tickets/map` | Geographic view of all tickets |
| Daily Radar | `/locate-tickets/radar` | Dashboard of today's priorities |
| Dig Check | `/locate-tickets/dig-check` | Field "Can I Dig Here?" workflow |

### UI Components (26)
| Component | File | Purpose |
|-----------|------|---------|
| TicketCard | `TicketCard.tsx` | List item for ticket display |
| StatusBadge | `StatusBadge.tsx` | Color-coded status indicator |
| TicketMap | `TicketMap.tsx` | All-tickets cluster map |
| EnhancedLocationMap | `EnhancedLocationMap.tsx` | Single-ticket detail map with zones |
| LocationMap | `LocationMap.tsx` | Simple location display |
| SafeZoneMap | `SafeZoneMap.tsx` | Dig zone polygon viewer |
| PhotoUpload | `PhotoUpload.tsx` | Camera capture and upload |
| PhotoCaptureModal | `PhotoCaptureModal.tsx` | Full-screen photo capture |
| PhotoVerificationPrompt | `PhotoVerificationPrompt.tsx` | AI analysis confirmation |
| NewTicketModal | `NewTicketModal.tsx` | Manual ticket creation |
| RequestRemarkModal | `RequestRemarkModal.tsx` | Request remark from utility |
| TicketRenewal | `TicketRenewal.tsx` | Expiring ticket renewal |
| AlertAcknowledgement | `AlertAcknowledgement.tsx` | Critical alert response |
| ConflictResolution | `ConflictResolution.tsx` | Utility conflict handling |
| VerifyMarksOnSite | `VerifyMarksOnSite.tsx` | Field mark verification |
| CanIDigHere | `CanIDigHere.tsx` | Real-time dig eligibility check |
| EmergencyDigUp | `EmergencyDigUp.tsx` | Emergency mode activation |
| MultiCrewCoordination | `MultiCrewCoordination.tsx` | Multi-crew ticket sharing |
| OfflineSyncStatus | `OfflineSyncStatus.tsx` | PWA offline indicator |
| TicketAnalyticsDashboard | `TicketAnalyticsDashboard.tsx` | Management metrics |
| PolygonDrawingTool | `PolygonDrawingTool.tsx` | Safe zone drawing |

### Edge Functions (16)
| Function | Purpose |
|----------|---------|
| `wv811-email-ingest` | Receives emails from SendGrid webhook |
| `wv811-email-parse` | AI extracts structured data from emails |
| `wv811-email-parse-manual` | Re-parse failed emails manually |
| `wv811-alert-process` | Scheduled alert processing (every 15 min) |
| `wv811-ticket-expire` | Mark expired tickets daily |
| `wv811-draft-renewal` | Generate renewal ticket drafts |
| `wv811-draft-followup` | Generate follow-up email drafts |
| `wv811-emergency-notify` | Send emergency SMS to all subscribers |
| `wv811-daily-radar` | Generate daily summary data |
| `wv811-audit-pack-export` | Export evidence pack as PDF/ZIP |
| `wv811-compliance-report` | Generate compliance reports |
| `wv811-offline-sync` | Sync offline-captured data |
| `sms-send` | Twilio SMS with smart batching |
| `analyze-photo` | Claude Vision photo analysis |
| `analyze-photos-batch` | Batch photo analysis |
| `geocode-ticket` | Geocodio address geocoding |

---

# 3. Ticket Lifecycle

## Status Flow Diagram

```
                          ┌─────────────────────┐
                          │     WV811 Email     │
                          │      Received       │
                          └──────────┬──────────┘
                                     │
                                     ▼
                          ┌─────────────────────┐
                          │      RECEIVED       │
                          │   (Email stored,    │
                          │    parsing queued)  │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │   AI Parse Email    │
                          │   Extract: ticket#, │
                          │   address, dates,   │
                          │   utilities         │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │       PENDING       │
                          │  (Waiting for all   │
                          │  utility responses) │
                          └──────────┬──────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │   IN_PROGRESS   │    │      CLEAR      │    │    CONFLICT     │
    │  (Work started) │    │ (All utilities  │    │(Utility reports │
    │                 │    │  responded OK)  │    │   a conflict)   │
    └────────┬────────┘    └────────┬────────┘    └────────┬────────┘
             │                      │                      │
             │                      │                      │
             ▼                      ▼                      ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                         WORK COMPLETE                            │
    │           (Photos uploaded, restoration documented)              │
    └──────────────────────────────────────────────────────────────────┘
             │
             │ (If ticket expires before renewal)
             ▼
    ┌─────────────────┐
    │     EXPIRED     │
    │  (Past 10 biz   │
    │   day limit)    │
    └─────────────────┘
             │
             │ (If cancelled by operator)
             ▼
    ┌─────────────────┐
    │    CANCELLED    │
    └─────────────────┘
```

## Status Definitions

| Status | Color | Meaning | Action Required |
|--------|-------|---------|-----------------|
| **RECEIVED** | Indigo | Email received, AI parsing in progress | Wait for parsing |
| **PENDING** | Blue | Waiting for utility responses | Monitor, prepare for dig |
| **IN_PROGRESS** | Amber | Work has started on this ticket | Continue work, take photos |
| **CLEAR** | Green | All utilities responded, safe to dig | Proceed with work |
| **CONFLICT** | Red | Utility reported a conflict | Contact utility, resolve issue |
| **EXPIRED** | Gray | Ticket past 10 business day limit | Request renewal ticket |
| **CANCELLED** | Light Gray | Ticket cancelled | No action needed |

## Key Dates Explained

### Legal Dig Date
- **Definition**: Earliest date you can legally begin excavation
- **Calculation**: 2 full business days after ticket creation
- **Example**: Ticket created Monday 8am → Legal dig date = Wednesday

### Ticket Expiration Date
- **Definition**: Last day the ticket is valid
- **Calculation**: 10 business days after legal dig date
- **Example**: Legal dig Wednesday → Expires in ~2 weeks
- **Action**: Must request renewal before expiration if work continues

### Business Day Rules
West Virginia 811 uses business days (excludes weekends and state holidays):
- Monday-Friday = Business days
- Saturday, Sunday = Non-business
- State holidays = Non-business (see `wv811_holidays` table)

---

# 4. User Interface Modules

## 4.1 Ticket List Page (`/locate-tickets`)

### Purpose
Central hub for viewing and managing all locate tickets.

### Features
- **Filtering**: By status (Pending, Clear, Conflict, etc.)
- **Search**: By ticket number, address, or excavator
- **Sorting**: By date, status, urgency
- **Quick Actions**: View, call excavator, navigate to site

### Status Indicators
```
┌─────────────────────────────────────────────────────────────────┐
│  Ticket #2024-123456                           [PENDING] 🔵     │
│  123 Main Street, St. Albans                                    │
│  ─────────────────────────────────────────────────────────────  │
│  Legal Dig: Dec 10   │   Expires: Dec 24   │   5/6 Utilities   │
│  ⚡ GAS  ⚡ ELECTRIC                         │   [View Details]  │
└─────────────────────────────────────────────────────────────────┘
```

### Risk Indicators
- **GAS badge**: Ticket includes gas utility (yellow)
- **ELEC badge**: Ticket includes electric utility (yellow)
- **Risk Score**: 0-100 based on utility type, deadline proximity
- **High Risk**: Red border on tickets with score ≥70 or gas/electric

## 4.2 Ticket Detail Page (`/locate-tickets/:id`)

### Sections

#### Header
- Ticket number, status badge
- Quick action buttons (Call, Navigate, Share)

#### Location Tab
- Interactive map with dig site marker
- Safe zone polygon (if drawn)
- Buffer zone overlay (2ft caution zone)
- Photo pins showing where photos were taken
- "Open in Google Maps" button

#### Utilities Tab
- List of all utilities on ticket
- Response status for each (Pending, Clear, Marked, Conflict)
- Contact information
- "Request Remark" button for re-marking

#### Photos Tab
- Evidence locker with categorized photos
- Upload button with category selection
- AI analysis results for each photo
- GPS coordinates and timestamp

#### Timeline Tab
- Activity log showing all changes
- Status transitions
- Photo uploads
- Alert history

#### Notes Tab
- Free-form notes and comments
- System-generated status change notes

## 4.3 Ticket Map Page (`/locate-tickets/map`)

### Features

#### Cluster Markers
- When zoomed out, tickets cluster into numbered circles
- Circle color indicates count: Blue (1-9), Amber (10-24), Red (25+)
- Click cluster to zoom in and expand

#### Individual Markers
- Color-coded by status
- Red border indicates high-risk (gas/electric)
- Click to see popup with ticket summary

#### Current Location
- GPS crosshair button (top-left)
- Shows pulsing blue dot for "you are here"
- Useful for field crews finding nearby tickets

#### Satellite View
- Default view is satellite hybrid (aerial imagery)
- Field crews prefer this for site orientation

#### Geocode All Button
- Shows count of unmapped tickets
- Click to auto-geocode addresses without coordinates
- Uses Geocodio API

## 4.4 Daily Radar Page (`/locate-tickets/radar`)

### Purpose
Morning briefing dashboard showing today's priorities.

### Sections

#### Critical Alerts
- Tickets expiring today
- Unacknowledged alerts
- Utility conflicts requiring action

#### Today's Schedule
- Tickets with legal dig date = today
- Ordered by priority

#### Upcoming (Next 7 Days)
- Timeline view of upcoming work
- Visual urgency indicators

#### Weather Impact
- Current weather conditions
- Forecast affecting field work

## 4.5 Dig Check Page (`/locate-tickets/dig-check`)

### Purpose
Field workflow for "Can I Dig Here Right Now?"

### Workflow
1. **Select Ticket**: Choose active ticket or scan QR code
2. **GPS Verification**: Confirm you're at the right location
3. **Mark Verification**: Confirm utility marks are visible
4. **Photo Evidence**: Capture required photos
5. **Dig Authorization**: System confirms dig is legal

### Safety Checks
- Legal dig date has passed
- All utilities have responded
- No conflicts reported
- Required photos uploaded
- GPS location matches ticket

---

# 5. Field Operations Workflow

## 5.1 New Ticket Arrives (Automatic)

```
Step 1: WV811 sends ticket email to designated inbox
        ↓
Step 2: SendGrid webhook triggers wv811-email-ingest function
        ↓
Step 3: Raw email stored in wv811_email_ingests table
        Status: PENDING
        ↓
Step 4: wv811-email-parse function triggered
        Claude AI extracts structured data:
        - Ticket number
        - Dig site address
        - Excavator info
        - Utility list
        - Key dates
        ↓
Step 5: Parsed data stored in wv811_tickets table
        Utility list stored in wv811_utility_responses table
        Status: RECEIVED → PENDING
        ↓
Step 6: Geocodio converts address to coordinates
        Map pin appears on Ticket Map
        ↓
Step 7: Alert subscriptions checked
        Notifications sent per user preferences
```

## 5.2 Pre-Excavation Checklist

Before breaking ground, field crews must complete:

| Step | Action | Photo Required | Notes |
|------|--------|----------------|-------|
| 1 | Review ticket in app | No | Confirm address, utilities |
| 2 | Navigate to site | No | Use "Directions" button |
| 3 | Verify legal dig date | No | Must be today or past |
| 4 | Check all utility marks | Yes | Photo each color present |
| 5 | Post physical ticket | Yes | Ticket posting photo |
| 6 | Document site overview | Yes | Wide shot with white lines |
| 7 | Begin "Can I Dig?" flow | No | System verification |

## 5.3 Active Excavation Documentation

During excavation, capture these photos:

| Phase | Photo Category | When to Capture |
|-------|----------------|-----------------|
| Start | Pre-excavation condition | Before first dig |
| Progress | Potholing/Daylighting | Hand-exposing utilities |
| Progress | Open trench | Daily progress |
| Progress | Traffic control | MOT setup |
| Issue | Conflict/obstruction | If found |
| Issue | Damage/strike | IMMEDIATELY if hit |

## 5.4 Emergency Dig-Up Protocol

If a utility line is struck:

```
IMMEDIATE ACTIONS:
┌──────────────────────────────────────────────────────────────────┐
│ 1. STOP ALL WORK                                                 │
│ 2. EVACUATE if gas/hazardous                                     │
│ 3. Call 911 if danger to public                                  │
│ 4. Call utility emergency line                                   │
│ 5. Open "Emergency Dig-Up" in app                                │
└──────────────────────────────────────────────────────────────────┘

APP EMERGENCY MODE:
┌──────────────────────────────────────────────────────────────────┐
│ - Activates red emergency banner                                 │
│ - Forces GPS-tagged photos                                       │
│ - Triggers wv811-emergency-notify function                       │
│ - Sends SMS to all subscribed supervisors                        │
│ - Creates incident record in database                            │
│ - Timestamps all actions for legal record                        │
└──────────────────────────────────────────────────────────────────┘
```

## 5.5 Site Restoration & Closeout

| Step | Action | Photo Required | Category |
|------|--------|----------------|----------|
| 1 | Backfill trench | Yes | Backfill |
| 2 | Compact material | No | - |
| 3 | Grade surface | Yes | Final Grade |
| 4 | Seed/straw if applicable | Yes | Final Grade |
| 5 | Restore pavement if applicable | Yes | Pavement Restoration |
| 6 | Final site condition | Yes | Final Condition |
| 7 | Mark ticket as complete | No | - |

---

# 6. Photo Evidence System

## 6.1 Overview

The "Evidence Locker" system provides legal protection through:
- **GPS tagging**: Every photo includes coordinates
- **Timestamps**: Exact date/time of capture
- **Categorization**: 27 standardized categories
- **AI Analysis**: Claude Vision verifies photo content
- **Compression**: Smart compression for field uploads

## 6.2 Photo Categories (27 Total)

### Pre-Excavation / Compliance (3)
| ID | Label | Required | Description |
|----|-------|----------|-------------|
| `site_overview_white_lines` | Site Overview (White Lines) | ✅ | Wide shot showing marked excavation area |
| `ticket_posting` | Ticket Posting | | Physical paper ticket on site |
| `pre_excavation_condition` | Pre-Excavation Condition | ✅ | Site before any digging |

### Utility Markings (10)
| ID | Label | Color | Description |
|----|-------|-------|-------------|
| `marks_electric` | Electric Marks | RED | Power lines, cables |
| `marks_gas` | Gas/Oil Marks | YELLOW | Gas, petroleum |
| `marks_telecom` | Telecom Marks | ORANGE | Cable, fiber, phone |
| `marks_water` | Water Marks | BLUE | Potable water |
| `marks_sewer` | Sewer/Storm Marks | GREEN | Sewer, storm drain |
| `marks_reclaimed` | Reclaimed Water | PURPLE | Irrigation, reclaimed |
| `marks_survey` | Survey/Temporary | PINK | Survey markers |
| `marks_excavation` | Excavation Outline | WHITE | Proposed dig boundary |
| `no_marks_48hr` | 48-Hour No Marks | AMBER | ✅ Silent assent documentation |
| `marks_positive_all` | All Marks Overview | | Wide shot all markings |

### Active Excavation (5)
| ID | Label | Description |
|----|-------|-------------|
| `potholing` | Potholing/Daylighting | Hand-exposing utility lines |
| `trench_open` | Trench/Open Pit | Daily excavation progress |
| `excavation_progress` | Excavation Progress | General work documentation |
| `traffic_control` | Traffic Control/MOT | Cones, signs, barriers |
| `equipment_on_site` | Equipment On Site | Machines at dig site |

### Restoration & Closeout (4)
| ID | Label | Required | Description |
|----|-------|----------|-------------|
| `backfill` | Backfill | | Trench being filled |
| `restoration_grade` | Final Grade | ✅ | Completed restoration |
| `pavement_restoration` | Pavement Restoration | | Asphalt/concrete repair |
| `final_condition` | Final Condition | ✅ | Site when crew leaves |

### Liability Protection (5)
| ID | Label | Description |
|----|-------|-------------|
| `pre_existing_damage` | Pre-Existing Damage | Damage present on arrival |
| `obstruction_no_access` | Obstruction/No Access | Locked gate, dog, blocked |
| `weather_conditions` | Weather Conditions | Rain, snow affecting work |
| `conflict_obstruction` | Conflict/Design Issue | Unexpected obstruction |
| `work_area_change` | Work Area Adjustment | Site boundary change |

### Emergency / Incident (3)
| ID | Label | Description |
|----|-------|-------------|
| `damage_strike` | Damage/Utility Strike | IMMEDIATE strike documentation |
| `emergency_initial` | Emergency - Initial | First photos of emergency |
| `emergency_secured` | Emergency - After Securing | Site made safe photos |

## 6.3 AI Photo Analysis

When a photo is uploaded:

```
Step 1: Image compressed (if >500KB)
        Max dimensions: 1920x1920
        JPEG quality: 85%
        ↓
Step 2: Photo uploaded to Supabase Storage
        Path: wv811-photos/{ticket_id}/{timestamp}_{category}.jpg
        ↓
Step 3: analyze-photo Edge Function triggered
        ↓
Step 4: Claude Vision API analyzes image
        Prompt: "Analyze this construction site photo..."
        ↓
Step 5: AI returns structured analysis:
        - Detected category (does it match selected?)
        - Confidence score (0-100)
        - Description of what's visible
        - Any safety concerns
        ↓
Step 6: User reviews AI analysis
        - Confirm if correct
        - Re-categorize if needed
        - Add notes
        ↓
Step 7: Photo record created in wv811_ticket_photos table
        AI analysis stored in ai_analysis_result column
```

## 6.4 Predictive Category Ordering

The system reorders photo categories based on ticket utilities:

```javascript
// If ticket has gas utility:
// → "Gas/Oil Marks (YELLOW)" moves to top of list

// If ticket has electric utility:
// → "Electric Marks (RED)" moves to top of list

// Smart quick-capture buttons adapt:
// → Shows 6 most relevant categories for this ticket
```

## 6.5 Image Compression

To handle large camera photos on slow mobile data:

| Setting | Value | Purpose |
|---------|-------|---------|
| Max Width | 1920px | Reduce resolution |
| Max Height | 1920px | Maintain aspect ratio |
| Quality | 85% | Balance quality/size |
| Format | JPEG | Universal compatibility |
| Threshold | 500KB | Only compress if larger |

**Result**: 12MP phone photos (5-8MB) → ~200-400KB upload

---

# 7. Alert & Notification System

## 7.1 Alert Types

| Alert Type | Timing | Priority | Description |
|------------|--------|----------|-------------|
| `48_HOUR` | 48 hours before legal dig | INFO | Heads up, dig date approaching |
| `24_HOUR` | 24 hours before legal dig | WARNING | Prepare for tomorrow |
| `SAME_DAY` | Day of legal dig | WARNING | Dig date is today |
| `OVERDUE` | Past expiration | CRITICAL | Ticket has expired |
| `EXPIRING_SOON` | 3 days before expiration | WARNING | Request renewal |
| `RESPONSE_RECEIVED` | Utility responds | INFO | New utility response |
| `CONFLICT` | Utility reports conflict | CRITICAL | Action required |
| `NEW_TICKET` | Ticket created | INFO | New ticket notification |

## 7.2 Notification Channels

| Channel | Delivery Method | Use Case |
|---------|-----------------|----------|
| Email | SendGrid | Detailed notifications, digests |
| SMS | Twilio | Urgent alerts, field reminders |
| Push | Web Push API | Mobile app notifications |
| In-App | UI banner | When user is in application |

## 7.3 Smart SMS Batching

To avoid SMS spam, notifications are batched:

```
BATCHING RULES:
┌──────────────────────────────────────────────────────────────────┐
│ EMERGENCY alerts        → Send immediately (no batching)         │
│ TICKET_UPDATE alerts    → Batch for 5 minutes                   │
│ EXPIRATION alerts       → Batch for 10 minutes                  │
│ REMINDER alerts         → Batch for 30 minutes                  │
└──────────────────────────────────────────────────────────────────┘

EXAMPLE:
- 9:00:00 AM → Ticket A update received, queued
- 9:01:30 AM → Ticket B update received, added to batch
- 9:03:00 AM → Ticket A another update, added to batch
- 9:05:00 AM → Batch window expires, SINGLE SMS sent:

  "📋 Ticket Update Summary (3 updates)
   1. Ticket A: Utility response received
   2. Ticket B: Status changed to CLEAR
   3. Ticket A: New photo uploaded"
```

## 7.4 User Alert Preferences

Users can configure:

| Setting | Options | Default |
|---------|---------|---------|
| Alert Role | OFFICE, FIELD | Based on user role |
| Quiet Mode | On/Off, with end time | Off |
| Email Alerts | On/Off | On |
| SMS Alerts | On/Off | Off (opt-in required) |
| Push Alerts | On/Off | On |
| In-App Alerts | On/Off | On |
| Always Alert Expired | On/Off | On |
| Always Alert Conflict | On/Off | On |
| Always Alert Emergency | On/Off | On |

## 7.5 Alert Processing Schedule

The `wv811-alert-process` function runs every 15 minutes:

```
1. Query get_tickets_needing_alerts() function
   - Finds tickets within 48 hours of legal dig
   - Finds tickets past expiration
   - Finds tickets with conflicts

2. For each ticket needing alert:
   a. Get subscribed users
   b. Check user preferences (quiet mode, role, channels)
   c. Filter duplicate alerts (don't re-send same type)
   d. Send via configured channels
   e. Log in wv811_ticket_alerts table

3. For critical alerts:
   a. Create acknowledgement record
   b. If not acknowledged within 30 min → escalate
   c. Escalation: notify supervisor, add to Daily Radar
```

---

# 8. Mapping & Geocoding

## 8.1 Map Components

### Ticket Map (All Tickets)
- **Purpose**: Geographic overview of all active tickets
- **Features**:
  - Cluster markers when zoomed out
  - Satellite hybrid imagery
  - Current location (GPS) button
  - Filter by status
  - Click marker → popup with ticket summary

### Enhanced Location Map (Single Ticket)
- **Purpose**: Detailed view of one ticket's dig site
- **Features**:
  - Dig site marker with address
  - Safe zone polygon (green)
  - Buffer zone polygon (yellow dashed, ~2ft)
  - Photo pin markers
  - "Open in Google Maps" directions

## 8.2 Geocoding Workflow

When a ticket needs coordinates:

```
Option A: Auto-geocode on ticket creation
┌──────────────────────────────────────────────────────────────────┐
│ 1. Ticket parsed from email                                      │
│ 2. Address fields extracted: street, city, state, zip           │
│ 3. geocode-ticket function called                                │
│ 4. Geocodio API returns lat/lng                                  │
│ 5. dig_site_location (PostGIS POINT) updated                    │
│ 6. Ticket appears on map                                         │
└──────────────────────────────────────────────────────────────────┘

Option B: Manual "Geocode All" button
┌──────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Geocode All" on Ticket Map page                  │
│ 2. Function queries tickets WHERE dig_site_location IS NULL     │
│ 3. Each address sent to Geocodio (max 50 per batch)             │
│ 4. Results update database                                       │
│ 5. Map refreshes showing new markers                             │
└──────────────────────────────────────────────────────────────────┘
```

## 8.3 Safe Zone & Buffer Zones

### Safe Zone (Green)
- Drawn by user using PolygonDrawingTool
- Represents the approved excavation boundary
- Solid green fill with darker border

### Buffer Zone (Yellow)
- Auto-generated ~2 feet outside safe zone
- Represents caution area
- Dashed yellow border
- Calculation: Expands polygon outward from centroid

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│     ╭╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╮                               │
│     ╎    Buffer Zone (Yellow)   ╎  ← ~2ft caution area          │
│     ╎   ┌────────────────────┐  ╎                               │
│     ╎   │                    │  ╎                               │
│     ╎   │   Safe Zone        │  ╎  ← Approved dig area          │
│     ╎   │   (Green)          │  ╎                               │
│     ╎   │                    │  ╎                               │
│     ╎   └────────────────────┘  ╎                               │
│     ╰╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╯                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 8.4 APWA Color Standards

The system follows APWA (American Public Works Association) color codes:

| Color | Utility Type | Examples |
|-------|--------------|----------|
| RED | Electric | Power lines, cables, conduit |
| YELLOW | Gas/Oil/Steam | Natural gas, petroleum, steam |
| ORANGE | Communications | Telecom, cable TV, fiber |
| BLUE | Water | Potable water mains |
| GREEN | Sewer/Drain | Sanitary sewer, storm drain |
| PURPLE | Reclaimed Water | Irrigation, reclaimed |
| PINK | Survey/Temporary | Survey markers, temporary |
| WHITE | Proposed Excavation | Your planned dig boundary |

---

# 9. Compliance & Reporting

## 9.1 Required Documentation

For legal protection and compliance, each ticket should have:

| Document | Required | Purpose |
|----------|----------|---------|
| Ticket email | Auto | Proof of notification |
| Utility responses | Auto | Proof utilities notified |
| Site overview photo | ✅ | Shows pre-dig conditions |
| Pre-excavation photo | ✅ | Baseline before work |
| Utility mark photos | ✅ | Proof marks present/absent |
| Final condition photo | ✅ | Site restoration proof |
| GPS coordinates | Auto | Location verification |
| Timestamps | Auto | Timeline documentation |

## 9.2 Audit Pack Export

The `wv811-audit-pack-export` function generates a complete evidence package:

```
AUDIT PACK CONTENTS:
┌──────────────────────────────────────────────────────────────────┐
│ 1. Cover Page                                                    │
│    - Ticket number, dates, status                                │
│    - Excavator information                                       │
│    - Utility list with responses                                 │
│                                                                  │
│ 2. Timeline                                                      │
│    - All status changes with timestamps                          │
│    - Alert history                                               │
│    - User actions                                                │
│                                                                  │
│ 3. Photo Evidence                                                │
│    - All photos organized by category                            │
│    - GPS coordinates and timestamps                              │
│    - AI analysis results                                         │
│                                                                  │
│ 4. Communications                                                │
│    - Original email                                              │
│    - Any follow-up correspondence                                │
│    - SMS notifications sent                                      │
│                                                                  │
│ 5. Maps                                                          │
│    - Satellite image of location                                 │
│    - Safe zone polygon overlay                                   │
│    - Photo location pins                                         │
└──────────────────────────────────────────────────────────────────┘

OUTPUT FORMAT: PDF or ZIP with all assets
```

## 9.3 Compliance Reports

The `wv811-compliance-report` function generates:

| Report | Frequency | Contents |
|--------|-----------|----------|
| Daily Summary | Daily | Tickets active, expired, alerts sent |
| Weekly Digest | Weekly | Ticket counts, completion rates |
| Monthly Compliance | Monthly | Full compliance metrics |
| Incident Report | On-demand | Single incident documentation |

---

# 10. Database Schema

## 10.1 Core Tables

### wv811_tickets
Primary table storing locate ticket data.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| organization_id | UUID | FK to organizations |
| ticket_number | TEXT | WV811 ticket number |
| ticket_type | TEXT | Normal, Emergency, Remark |
| dig_site_address | TEXT | Street address |
| dig_site_city | TEXT | City name |
| dig_site_county | TEXT | County name |
| dig_site_state | TEXT | State (default WV) |
| dig_site_zip | TEXT | ZIP code |
| dig_site_location | GEOMETRY(POINT) | PostGIS coordinates |
| dig_area_polygon | GEOMETRY(POLYGON) | Safe zone boundary |
| excavator_company | TEXT | Requesting company |
| excavator_name | TEXT | Contact name |
| excavator_phone | TEXT | Contact phone |
| work_type | ENUM | Type of excavation |
| ticket_created_at | TIMESTAMPTZ | When ticket was created |
| legal_dig_date | DATE | Earliest dig date |
| ticket_expires_at | DATE | Expiration date |
| status | ENUM | Current status |
| total_utilities | INTEGER | Count of utilities |
| responded_utilities | INTEGER | Count with responses |
| risk_score | INTEGER | 0-100 risk assessment |
| has_gas_utility | BOOLEAN | Contains gas utility |
| has_electric_utility | BOOLEAN | Contains electric utility |

### wv811_utility_responses
Individual utility company responses per ticket.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ticket_id | UUID | FK to wv811_tickets |
| utility_code | TEXT | Utility's 811 code |
| utility_name | TEXT | Company name |
| utility_type | TEXT | Gas, Electric, etc. |
| response_type | ENUM | CLEAR, MARKED, CONFLICT, etc. |
| response_received_at | TIMESTAMPTZ | When response received |
| contact_phone | TEXT | Utility contact number |

### wv811_ticket_photos
Photo evidence storage with AI analysis.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ticket_id | UUID | FK to wv811_tickets |
| storage_path | TEXT | Supabase storage path |
| category | TEXT | Photo category ID |
| latitude | DECIMAL | GPS latitude |
| longitude | DECIMAL | GPS longitude |
| captured_at | TIMESTAMPTZ | When photo taken |
| ai_analysis_result | JSONB | Claude Vision analysis |
| ai_analyzed_at | TIMESTAMPTZ | When analyzed |
| user_confirmed | BOOLEAN | User verified analysis |

### wv811_alert_subscriptions
User notification preferences.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to auth.users |
| organization_id | UUID | FK to organizations |
| channel_email | BOOLEAN | Email notifications |
| channel_sms | BOOLEAN | SMS notifications |
| channel_push | BOOLEAN | Push notifications |
| alert_48_hour | BOOLEAN | 48hr alerts enabled |
| alert_24_hour | BOOLEAN | 24hr alerts enabled |
| alert_same_day | BOOLEAN | Same-day alerts |
| phone_number | TEXT | SMS destination |

### wv811_ticket_alerts
Alert history and delivery tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ticket_id | UUID | FK to wv811_tickets |
| user_id | UUID | FK to auth.users |
| alert_type | ENUM | Type of alert sent |
| channel | ENUM | Delivery channel |
| sent_at | TIMESTAMPTZ | When sent |
| delivered_at | TIMESTAMPTZ | When delivered |
| read_at | TIMESTAMPTZ | When read |

## 10.2 Supporting Tables

| Table | Purpose |
|-------|---------|
| wv811_email_ingests | Raw email storage |
| wv811_holidays | WV state holidays |
| wv811_ticket_notes | Comments and activity |
| wv811_project_tickets | Link to projects |
| wv811_digest_preferences | Digest settings |
| sms_logs | SMS delivery tracking |
| geocode_log | Geocoding history |

---

# 11. Edge Functions Reference

## 11.1 Email Processing

### wv811-email-ingest
- **Trigger**: SendGrid webhook POST
- **Input**: Raw email data (headers, body, attachments)
- **Output**: Email stored in wv811_email_ingests
- **Next**: Triggers wv811-email-parse

### wv811-email-parse
- **Trigger**: New email ingest or manual call
- **Input**: Email ingest ID or batch size
- **Process**: Claude AI extracts ticket data
- **Output**: Ticket created in wv811_tickets

### wv811-email-parse-manual
- **Trigger**: Manual retry button
- **Input**: Specific email ingest ID
- **Purpose**: Re-process failed parsing

## 11.2 Alert System

### wv811-alert-process
- **Trigger**: Cron schedule (every 15 minutes)
- **Process**:
  1. Query tickets needing alerts
  2. Get subscriber preferences
  3. Filter by quiet mode, role
  4. Send via appropriate channels
- **Output**: Alerts logged in wv811_ticket_alerts

### wv811-emergency-notify
- **Trigger**: Emergency dig-up activation
- **Input**: Ticket ID, emergency details
- **Process**: Immediate SMS to all supervisors
- **Output**: SMS sent, logged in sms_logs

### sms-send
- **Trigger**: Alert system or direct call
- **Input**: Phone number, message, type
- **Features**: Smart batching, rate limiting
- **Output**: SMS delivered via Twilio

## 11.3 Maintenance

### wv811-ticket-expire
- **Trigger**: Daily cron (midnight)
- **Process**: Mark tickets past expiration as EXPIRED
- **Output**: Status updated, count returned

### wv811-draft-renewal
- **Trigger**: Manual or scheduled
- **Input**: Expiring ticket ID
- **Output**: Draft renewal email generated

## 11.4 Photo Analysis

### analyze-photo
- **Trigger**: Photo upload
- **Input**: Storage path, category
- **Process**: Claude Vision analyzes image
- **Output**: Analysis JSON stored with photo

### analyze-photos-batch
- **Trigger**: Manual batch processing
- **Input**: Array of photo IDs
- **Output**: Multiple photos analyzed

## 11.5 Location Services

### geocode-ticket
- **Trigger**: Ticket creation or manual
- **Input**: Ticket ID(s) or geocodeAll flag
- **Process**: Geocodio API lookup
- **Output**: Coordinates stored in PostGIS

## 11.6 Reporting

### wv811-daily-radar
- **Trigger**: Morning cron or manual
- **Output**: JSON summary for Daily Radar page

### wv811-audit-pack-export
- **Trigger**: Manual export request
- **Input**: Ticket ID
- **Output**: PDF or ZIP file

### wv811-compliance-report
- **Trigger**: Scheduled or manual
- **Input**: Date range, report type
- **Output**: PDF compliance report

---

# 12. Troubleshooting Guide

## 12.1 Common Issues

### Ticket Not Appearing on Map
**Symptoms**: Ticket exists but no map marker
**Cause**: Missing coordinates (dig_site_location is NULL)
**Solution**:
1. Go to Ticket Map page
2. Click "Geocode All" button
3. Wait for geocoding to complete
4. Refresh map

### Alert Not Received
**Symptoms**: Expected SMS/email not delivered
**Causes & Solutions**:
| Cause | Solution |
|-------|----------|
| Quiet mode enabled | Check user preferences, disable quiet mode |
| Wrong phone number | Verify E.164 format (+1XXXXXXXXXX) |
| Channel disabled | Enable SMS/email in alert preferences |
| Alert type disabled | Enable specific alert type in preferences |

### Photo Upload Failed
**Symptoms**: Photo doesn't save, error message
**Causes & Solutions**:
| Cause | Solution |
|-------|----------|
| No internet | Wait for connectivity, retry |
| File too large | Compression should handle, check file |
| Storage quota | Check Supabase storage limits |
| Invalid file type | Must be JPEG or PNG |

### AI Analysis Wrong Category
**Symptoms**: AI suggests different category than selected
**Solution**: This is a feature, not a bug!
1. Review AI suggestion
2. If AI is correct, accept suggestion
3. If your category is correct, confirm original
4. Either way, add notes for clarity

### Ticket Status Not Updating
**Symptoms**: All utilities responded but status still PENDING
**Cause**: Trigger may not have fired
**Solution**:
1. Manually refresh page
2. Check utility responses tab
3. If all show CLEAR, contact support

## 12.2 Emergency Procedures

### Complete System Outage
1. Use paper tickets as backup
2. Take photos with phone camera (not app)
3. Document GPS coordinates manually
4. Enter data when system recovers

### Lost Mobile Data in Field
1. App works offline for viewing cached tickets
2. Photos queue for upload when online
3. Offline indicator shows sync status
4. All data syncs automatically on reconnect

### Accidental Wrong Status
1. Status changes are logged
2. Contact supervisor to revert
3. Admin can manually update status
4. Timeline shows all changes for audit

---

# Appendix A: Quick Reference Card

## Key Dates Formula
```
Ticket Created → +2 business days → Legal Dig Date
Legal Dig Date → +10 business days → Expiration Date
```

## Status Colors
```
🟣 RECEIVED   - Parsing
🔵 PENDING    - Waiting
🟡 IN_PROGRESS - Working
🟢 CLEAR      - All good
🔴 CONFLICT   - Problem
⚫ EXPIRED    - Too late
```

## Photo Requirements (Minimum)
```
✅ Site Overview (White Lines)
✅ Pre-Excavation Condition
✅ All Utility Marks OR 48-Hour No Marks
✅ Final Grade/Restoration
✅ Final Condition
```

## Emergency Contacts
```
WV811: 811 or 1-800-245-4848
Gas Emergency: (utility specific)
Electric Emergency: (utility specific)
Company Safety: (your number here)
```

---

# Appendix B: Glossary

| Term | Definition |
|------|------------|
| **811** | National "Call Before You Dig" number |
| **APWA** | American Public Works Association (color standards) |
| **Business Day** | Monday-Friday excluding state holidays |
| **Daylighting** | Hand-digging to expose utility lines |
| **Legal Dig Date** | First date excavation is legally permitted |
| **Potholing** | Creating small hole to verify utility location |
| **Remark** | Request for utility to re-mark faded lines |
| **Silent Assent** | No response within 48 hours = assumed clear |
| **Strike** | Accidental contact with utility line |
| **Tolerance Zone** | 18-24" on each side of marked utility |
| **White Lining** | Marking proposed excavation boundary |

---

*Document generated for Triton Construction AI Platform*
*For support: Contact system administrator*
