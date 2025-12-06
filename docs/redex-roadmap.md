# REDEX OPERATIONS: LEAD TO INSTALLATION ROADMAP
## Complete System Architecture & Implementation Guide

**Document Version:** 1.0  
**Date:** November 25, 2025  
**Scope:** End-to-end workflow from initial lead through completed installation

---

# EXECUTIVE SUMMARY

This roadmap covers **6 major phases** with **47 sub-phases** spanning:
- Salesforce CRM (Lead → Closed Won)
- Supabase Integration (Auto-sync on close)
- Survey Management (Field validation)
- Project & Installation Tracking
- Customer Activation
- Post-Installation Services

**Data Flow:**
```
SALESFORCE                    SUPABASE                      FIELD OPS
──────────────────────────────────────────────────────────────────────────
Lead → Account → Opportunity → [Closed Won Trigger] → Customer (Provisional)
         ↓                              ↓                      ↓
      Contact                         Job                   Site Survey
         ↓                              ↓                      ↓
      Location                      Project              Survey Items
         ↓                              ↓                      ↓
   Line Items + Location         Project Devices        Installation
         ↓                              ↓                      ↓
   Products + Dependencies       Device Tracking      Customer Active
```

---

# PHASE 1: SALESFORCE FOUNDATION
## Lead Management & Account Setup

### 1.1 Lead Object Configuration
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 1.1.1 | Lead Object Fields | Standard + custom fields for security industry | Field definitions |
| 1.1.2 | Lead Sources | Web, Referral, Trade Show, Cold Call, Partner | Picklist values |
| 1.1.3 | Lead Status Values | New, Contacted, Qualified, Unqualified, Converted | Picklist values |
| 1.1.4 | Lead Assignment Rules | Route by geography/market to correct sales rep | Assignment rules |
| 1.1.5 | Lead Conversion Mapping | Map Lead fields → Account, Contact, Opportunity | Conversion settings |
| 1.1.6 | Web-to-Lead Form | Website integration for inbound leads | Web form |

### 1.2 Account Object Configuration
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 1.2.1 | Account Record Types | Prospect, Customer, Partner, Vendor | Record types |
| 1.2.2 | Account Custom Fields | BTN, Tax ID, Industry vertical | Custom fields |
| 1.2.3 | Account Hierarchy | Parent/Child relationships for multi-location | Self-lookup |
| 1.2.4 | Account Page Layouts | Different views for Prospect vs Customer | Page layouts |
| 1.2.5 | Account Sharing Rules | Sales team territory access | Sharing rules |

### 1.3 Contact Object Configuration
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 1.3.1 | Contact Role Fields | Administrative, Technical, Billing, Executive, Alarm | Checkbox fields |
| 1.3.2 | Alarm Level Field | Tier 1, Tier 2, Tier 3 escalation levels | Picklist field |
| 1.3.3 | Contact Page Layout | Role-based information display | Page layout |
| 1.3.4 | Contact Validation | Require email OR phone for all contacts | Validation rule |

### 1.4 Market Object (Custom)
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 1.4.1 | Market__c Object | Geographic service regions | Custom object |
| 1.4.2 | Market Fields | Name, Labor_Rate__c | Custom fields |
| 1.4.3 | Initial Data | Mobile, Birmingham, Other markets | Data records |
| 1.4.4 | Market Tab | Navigation access | Custom tab |

### 1.5 Location Object (Custom)
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 1.5.1 | Location__c Object | Physical installation sites | Custom object |
| 1.5.2 | Location → Account Lookup | Account__c (required) | Lookup field |
| 1.5.3 | Location Address Fields | Street, City, State, Zip | Text fields |
| 1.5.4 | Location Type | Retail, Office, Warehouse, Industrial, Residential | Picklist field |
| 1.5.5 | Location → Market Lookups | Sales_Market__c, Service_Market__c | Lookup fields |
| 1.5.6 | Monitoring Fields | Monitoring_Account_Name__c, Platform_Account_Name__c | Picklist fields |
| 1.5.7 | Alarm Permit Field | Alarm_Permit__c | Text field |
| 1.5.8 | Location Tab | Navigation access | Custom tab |
| 1.5.9 | Location Related List | Show on Account page | Related list |

---

# PHASE 2: OPPORTUNITY & QUOTING
## Sales Pipeline Through Closed Won

### 2.1 Opportunity Object Configuration
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 2.1.1 | Opportunity Stages | New, Proposal, Negotiation, Closed Won, Closed Lost | Picklist values |
| 2.1.2 | Opportunity → Market Lookup | Market__c for geographic assignment | Lookup field |
| 2.1.3 | Contact Lookups | Customer_Contact__c, Technical_Contact__c, Billing_Contact__c | Lookup fields |
| 2.1.4 | Selected Term Field | 12, 24, 36, 60 month contract options | Picklist field |
| 2.1.5 | Loss Reason Field | Required when Closed Lost | Picklist field |
| 2.1.6 | Opportunity Page Layout | Stage-appropriate field visibility | Page layout |
| 2.1.7 | Sales Path | Visual stage progression | Path component |

### 2.2 Price Book Configuration
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 2.2.1 | Standard Price Book | Single price book for all markets | Price book |
| 2.2.2 | Price Book Activation | Enable for all Opportunities | Activation |

### 2.3 Product Catalog (Product2)
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 2.3.1 | Product Categories | Video, Access Control, Intrusion Detection, Energy Management, Internet | Family picklist |
| 2.3.2 | Product Type Field | Product_Type__c (Commercial, Residential, Both) | Picklist field |
| 2.3.3 | Market Availability | Mobile_Market__c, Birmingham_Market__c, Other_Market__c, Victra_Market__c | Checkbox fields |
| 2.3.4 | Standalone Flag | Standalone__c (can exist without dependencies) | Checkbox field |
| 2.3.5 | MRC Pricing | List_Price_MRC__c | Currency field |
| 2.3.6 | Vendor License Links | Vendor_License_1__c, Vendor_License_2__c, Vendor_License_3__c | Lookup fields |
| 2.3.7 | Product Data Import | All security products with codes | Data load |

### 2.4 OpportunityLineItem Configuration
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 2.4.1 | Location Lookup | Location__c → Location__c object | Lookup field |
| 2.4.2 | Location Validation | Location must belong to Opportunity's Account | Validation rule |
| 2.4.3 | Line Item Page Layout | Product, Quantity, Price, Location | Page layout |

### 2.5 Vendor License System
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 2.5.1 | Vendor License Object | Vendor_License__c (Alarm.com packages, etc.) | Custom object |
| 2.5.2 | License Fields | MRC__c, Cost_NRC__c, Vendor name | Custom fields |
| 2.5.3 | License Cost Metadata | Vendor_License_Cost_Table__mdt (quantity pricing) | Custom metadata |
| 2.5.4 | License Data | Commercial Plus, Interactive Gold, etc. | Data records |

### 2.6 Equipment Item SKU System
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 2.6.1 | Equipment_Item_SKU__c Object | Physical hardware catalog | Custom object |
| 2.6.2 | Equipment Fields | Part numbers, manufacturer, GL accounts | Custom fields |
| 2.6.3 | Required Field Flags | Serial_Number_Required__c, Mac_ID_Required__c, IMEI_Required__c, ICCID_Required__c, Network_Security_Key_Required__c | Picklist fields |
| 2.6.4 | Labor Hours | Default_Labor_Hours__c | Number field |
| 2.6.5 | Preferred Vendor | Preferred_Vendor_Equipment__c → Vendor_SKU_Cost__c | Lookup field |
| 2.6.6 | Equipment Data | All hardware SKUs | Data load |

### 2.7 Vendor SKU Cost System
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 2.7.1 | Vendor_SKU_Cost__c Object | Vendor-specific equipment pricing | Custom object |
| 2.7.2 | Cost Fields | Cost amount, vendor name | Custom fields |
| 2.7.3 | Equipment Link | Equipment_Item_SKU__c lookup | Lookup field |
| 2.7.4 | Vendor Pricing Data | SSSI, other vendor costs | Data load |

### 2.8 Product Equipment Junction
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 2.8.1 | Product_Equipment__c Object | Links Products to required Equipment | Junction object |
| 2.8.2 | Product Lookup | Product2 reference | Lookup field |
| 2.8.3 | Equipment Lookup | Equipment_Item_SKU__c reference | Lookup field |
| 2.8.4 | Quantity Field | How many of each equipment per product | Number field |
| 2.8.5 | Type Field | Default vs Optional equipment | Picklist field |
| 2.8.6 | Junction Data | Product → Equipment mappings | Data load |

### 2.9 Account Equipment Price (Override)
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 2.9.1 | Account_Equipment_Price__c Object | Customer-specific pricing overrides | Custom object |
| 2.9.2 | Account Lookup | Which customer | Lookup field |
| 2.9.3 | Equipment Lookup | Which equipment | Lookup field |
| 2.9.4 | Override Price | Customer-specific price | Currency field |

### 2.10 Campaign Integration
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 2.10.1 | Campaign Object Setup | Lead source tracking | Standard object config |
| 2.10.2 | Campaign Types | Trade Show, Email, Referral Program, Partner | Picklist values |
| 2.10.3 | Campaign Member Status | Sent, Responded, Converted | Picklist values |
| 2.10.4 | Opportunity → Campaign | Primary Campaign Source tracking | Standard field |

---

# PHASE 3: SALESFORCE → SUPABASE INTEGRATION
## Automatic Sync on Closed Won

### 3.1 Apex Trigger Infrastructure
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 3.1.1 | OpportunityTrigger | After Update trigger on Opportunity | Apex trigger |
| 3.1.2 | Trigger Handler Pattern | Separate logic from trigger | Handler class |
| 3.1.3 | Stage Change Detection | ISCHANGED(StageName) AND StageName = 'Closed Won' | Trigger logic |

### 3.2 RedexSyncHelper Class
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 3.2.1 | @future Method | syncToSupabase(opportunityId) for async callout | Future method |
| 3.2.2 | Opportunity Query | Full opportunity with Account, Market data | SOQL query |
| 3.2.3 | Line Items Query | OpportunityLineItems with Product2.Family, Location__c | SOQL query |
| 3.2.4 | Payload Builder | JSON structure for Supabase | JSON serialization |
| 3.2.5 | HTTP Callout | POST to Edge Function | HTTP request |
| 3.2.6 | Category Mapping | Product Family → Database category | Helper method |
| 3.2.7 | Error Handling | Logging and graceful failure | Try/catch blocks |

### 3.3 Test Coverage
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 3.3.1 | Test Class | RedexSyncHelperTest with 100% coverage | Test class |
| 3.3.2 | Mock HTTP | HttpCalloutMock implementation | Mock class |
| 3.3.3 | Test Data | Account, Contact, Location, Opportunity, Line Items | Test setup |
| 3.3.4 | Validation Test | Location → Account validation rule test | Test method |

### 3.4 Remote Site Settings
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 3.4.1 | Supabase Endpoint | Allow callouts to Supabase URL | Remote site |

---

# PHASE 4: SUPABASE DATABASE & EDGE FUNCTIONS
## Backend Data Processing

### 4.1 Core Tables
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 4.1.1 | customers | Company records (provisional → active) | Table + RLS |
| 4.1.2 | jobs | Work orders linking customer → survey → project | Table + RLS |
| 4.1.3 | site_surveys | Survey records with status tracking | Table + RLS |
| 4.1.4 | site_survey_items | Individual equipment items with locations | Table + RLS |
| 4.1.5 | projects | Installation projects created from surveys | Table + RLS |
| 4.1.6 | project_devices | Devices to install with status tracking | Table + RLS |
| 4.1.7 | salesforce_equipment | Aggregated equipment summary | Table + RLS |

### 4.2 Product Dependency Tables
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 4.2.1 | products | Product catalog synced from Salesforce | Table + RLS |
| 4.2.2 | product_dependencies | Required products (keypad for door) | Table |
| 4.2.3 | product_choice_groups | Either/or options (lock type) | Table |
| 4.2.4 | product_choice_options | Options within choice groups | Table |
| 4.2.5 | product_choice_dependencies | Dependencies based on choices | Table |
| 4.2.6 | category_hub_requirements | Category-level rules (intrusion → hub) | Table |

### 4.3 Supporting Tables
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 4.3.1 | technicians | Field tech records | Table + RLS |
| 4.3.2 | locations | Supabase location records | Table + RLS |
| 4.3.3 | expenses | Project/job expenses | Table + RLS |
| 4.3.4 | field_installation_photos | Installation photos | Table + RLS |
| 4.3.5 | field_installation_time_entries | Time tracking | Table + RLS |

### 4.4 Database Functions
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 4.4.1 | get_required_products() | Calculate dependencies for product | PL/pgSQL function |
| 4.4.2 | calculate_head_end_equipment() | Overflow calculations for NVR/controllers | PL/pgSQL function |
| 4.4.3 | sync_survey_item_to_project_device() | Auto-sync survey items → project devices | Trigger function |

### 4.5 Database Triggers
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 4.5.1 | trg_sync_survey_to_project | On site_survey_items INSERT/UPDATE/DELETE | Trigger |

### 4.6 Edge Function: sf-opportunity-sync
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 4.6.1 | Payload Validation | Validate incoming JSON structure | TypeScript |
| 4.6.2 | Customer Upsert | Create or find existing provisional customer | TypeScript |
| 4.6.3 | Job Creation | Create job linked to customer | TypeScript |
| 4.6.4 | Survey Creation | Create site_survey linked to job | TypeScript |
| 4.6.5 | Project Creation | Create project linked to survey | TypeScript |
| 4.6.6 | Line Item Expansion | Quantity → individual survey items | TypeScript |
| 4.6.7 | Category Mapping | Product Family → database category | TypeScript |
| 4.6.8 | Location Population | Line item location → survey item location_name | TypeScript |
| 4.6.9 | Auto-Dependencies | Add keypads, security hub as needed | TypeScript |
| 4.6.10 | Response Handling | Return success/error with IDs | TypeScript |

### 4.7 Edge Function: sf-product-sync
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 4.7.1 | Product Upsert | Sync products from Salesforce | TypeScript |
| 4.7.2 | Category Mapping | Map Product Family to category | TypeScript |
| 4.7.3 | Deactivation | Mark removed products inactive | TypeScript |

### 4.8 Product Trigger (Salesforce)
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 4.8.1 | ProductTrigger | Auto-sync on Product2 changes | Apex trigger |
| 4.8.2 | ProductTriggerTest | 100% test coverage | Test class |

---

# PHASE 5: SURVEY MANAGEMENT UI
## Field Surveyor Workflow

### 5.1 Site Surveys List Page
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 5.1.1 | SiteSurveys.tsx | List all surveys with status | React page |
| 5.1.2 | Status Filters | Pending, In Progress, Complete | Filter component |
| 5.1.3 | Survey Cards | Summary view with customer, address, item count | Card component |
| 5.1.4 | Navigation | Click to survey detail | Router link |

### 5.2 Survey Detail Page
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 5.2.1 | SiteSurveyDetail.tsx | Full survey view with items | React page |
| 5.2.2 | Survey Header | Customer, address, status badge | Header component |
| 5.2.3 | Items List | All survey items with location inputs | List component |
| 5.2.4 | Auto-Save | Save location_name on blur | Mutation hook |

### 5.3 Survey Item Components
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 5.3.1 | SurveyItemCard.tsx | Individual item display with category icon | Card component |
| 5.3.2 | SurveyItemDialog.tsx | Edit item details | Dialog component |
| 5.3.3 | Category Icons | Video, Access Control, Intrusion, Energy, Network | Icon mapping |
| 5.3.4 | Auto-Generated Badge | Show items added by system | Badge component |

### 5.4 Add Item with Dependencies
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 5.4.1 | AddItemDialog | Product selection with dependencies | Dialog component |
| 5.4.2 | Lock Type Selection | Magnetic Lock vs Electric Strike | Choice dropdown |
| 5.4.3 | Edge Function: survey-add-item-with-deps | Add item + auto-dependencies | Edge function |
| 5.4.4 | Dependency Display | Show auto-added items indented | UI component |

### 5.5 Survey Completion Handler
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 5.5.1 | Complete Survey Button | Trigger completion flow | Button component |
| 5.5.2 | Location Validation | All items must have location_name | Validation check |
| 5.5.3 | Project Creation | Create project from survey | Database operations |
| 5.5.4 | Device Sync | Copy survey items → project devices | Trigger execution |
| 5.5.5 | Status Updates | Update survey, job status | Database updates |
| 5.5.6 | Navigation | Redirect to project page | Router navigation |

---

# PHASE 6: INSTALLATION TRACKING
## Field Technician Workflow

### 6.1 Installation Pipeline Dashboard
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 6.1.1 | InstallationPipelineWidget.tsx | 6-stage pipeline view | Widget component |
| 6.1.2 | Pipeline Stages | New, Awaiting Survey, Surveying, Ready, Installing, Complete | Stage columns |
| 6.1.3 | Project Cards | Customer, device count, progress | Card component |
| 6.1.4 | Dashboard Integration | Add to Tech, Service, Management dashboards | Page integration |

### 6.2 Project List Page
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 6.2.1 | FieldInstallation.tsx | List all installation projects | React page |
| 6.2.2 | Status Filters | By pipeline stage | Filter component |
| 6.2.3 | Search | By customer, address | Search component |
| 6.2.4 | Sort | By date, status, customer | Sort component |

### 6.3 Project Detail Page
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 6.3.1 | FieldProjectDetail.tsx | 8-tab project view | React page |
| 6.3.2 | Overview Tab | Project summary, customer info | Tab component |
| 6.3.3 | Locations Tab | Installation sites | Tab component |
| 6.3.4 | Devices Tab | All devices with status | Tab component |
| 6.3.5 | Checklists Tab | Installation checklists | Tab component |
| 6.3.6 | Expenses Tab | Project expenses | Tab component |
| 6.3.7 | Photos Tab | Installation photos | Tab component |
| 6.3.8 | Time Tab | Time entries | Tab component |
| 6.3.9 | Notes Tab | Project notes | Tab component |

### 6.4 Device Installation Components
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 6.4.1 | DevicesList.tsx | All project devices | List component |
| 6.4.2 | DeviceCard | Individual device with status | Card component |
| 6.4.3 | InstallationProgressBar.tsx | X/Y installed progress | Progress component |
| 6.4.4 | Mark Installed Button | Update device status | Button + mutation |
| 6.4.5 | Serial Number Input | Capture required identifiers | Input component |
| 6.4.6 | QR/Barcode Scanner | Quick serial entry | Scanner component |

### 6.5 Device Wizards
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 6.5.1 | CameraWizard | Camera-specific installation | Wizard component |
| 6.5.2 | SensorWizard | Sensor-specific installation | Wizard component |
| 6.5.3 | AccessControlWizard | Door controller installation | Wizard component |
| 6.5.4 | Dynamic Fields | Based on Equipment_Item_SKU required fields | Dynamic form |

### 6.6 Installation Completion
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 6.6.1 | Complete Project Button | Trigger completion flow | Button component |
| 6.6.2 | Device Validation | All devices must be installed | Validation check |
| 6.6.3 | Customer Activation | provisional → active status | Database update |
| 6.6.4 | Device Linking | Link devices to customer | Database update |
| 6.6.5 | Status Updates | Project, job → complete | Database updates |
| 6.6.6 | Completion Summary | Show installed equipment | Summary component |

---

# PHASE 7: POST-INSTALLATION
## Customer Activation & Service

### 7.1 Customer Activation Flow
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 7.1.1 | Status Update | customers.status = 'active' | Database update |
| 7.1.2 | Activation Date | Set activation_date timestamp | Database update |
| 7.1.3 | Device In-Service | Set in_service_date on all devices | Database update |
| 7.1.4 | Notification | Alert operations team | Notification |

### 7.2 Customer Profile Page
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 7.2.1 | CustomerDetail.tsx | Full customer view | React page |
| 7.2.2 | Equipment List | All installed devices with serials | List component |
| 7.2.3 | Service History | Past jobs and projects | History component |
| 7.2.4 | Contact Info | All contacts with roles | Contact list |

### 7.3 Service Ticket System
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 7.3.1 | Ticket Creation | New service request | Form component |
| 7.3.2 | Ticket Assignment | Route to technician | Assignment logic |
| 7.3.3 | Ticket Tracking | Status progression | Status workflow |
| 7.3.4 | Resolution | Close ticket with notes | Completion flow |

### 7.4 Reporting & Analytics
| Sub-Phase | Component | Description | Deliverable |
|-----------|-----------|-------------|-------------|
| 7.4.1 | Installation Metrics | Completion rates, time to install | Dashboard widgets |
| 7.4.2 | Revenue Tracking | By project, customer, market | Reports |
| 7.4.3 | Technician Performance | Jobs completed, time tracking | Reports |
| 7.4.4 | Customer Health | Active vs churned, equipment status | Dashboard |

---

# IMPLEMENTATION SUMMARY

## Phase Totals

| Phase | Name | Sub-Phases | Status |
|-------|------|------------|--------|
| 1 | Salesforce Foundation | 22 | ☐ |
| 2 | Opportunity & Quoting | 42 | ☐ |
| 3 | SF → Supabase Integration | 14 | ☐ |
| 4 | Supabase Database & Edge Functions | 31 | ☐ |
| 5 | Survey Management UI | 19 | ☐ |
| 6 | Installation Tracking | 24 | ☐ |
| 7 | Post-Installation | 14 | ☐ |
| **TOTAL** | | **166** | |

## Critical Path

```
1.4 Market__c → 1.5 Location__c → 2.4 OpportunityLineItem.Location__c
                                           ↓
2.3 Product Catalog → 2.6 Equipment SKU → 2.8 Product Equipment Junction
                                           ↓
3.1 OpportunityTrigger → 3.2 RedexSyncHelper → 4.6 sf-opportunity-sync
                                           ↓
4.1 Core Tables → 4.5 Sync Trigger → 5.2 Survey Detail → 5.5 Completion Handler
                                           ↓
6.3 Project Detail → 6.4 Device Installation → 6.6 Installation Completion
                                           ↓
7.1 Customer Activation → 7.2 Customer Profile
```

## Dependencies

| Component | Depends On |
|-----------|-----------|
| Location__c | Market__c |
| OpportunityLineItem.Location__c | Location__c |
| Validation Rule | Location__c, OpportunityLineItem.Location__c |
| RedexSyncHelper | Location__c, Market__c, All Product objects |
| sf-opportunity-sync | All Supabase tables |
| Survey Completion | site_survey_items, projects, project_devices |
| Installation Completion | project_devices, customers |

---

# CHECKLIST FORMAT

Use this format to mark completion:

```
☐ = Not Started
◐ = In Progress  
☑ = Complete
⚠ = Blocked/Issue
```

Example:
```
### 1.4 Market Object (Custom)
| Sub-Phase | Status | Notes |
|-----------|--------|-------|
| 1.4.1 Market__c Object | ☑ | Deployed 11/25 |
| 1.4.2 Market Fields | ☑ | Labor_Rate__c added |
| 1.4.3 Initial Data | ◐ | Need to add Other market |
| 1.4.4 Market Tab | ☐ | |
```

---

*Document End - Reply with completion status for each sub-phase*
