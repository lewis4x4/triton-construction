# REDEX LEAD TO INSTALLATION - STATUS CHECKLIST
## Mark each item: ☐ Not Started | ◐ In Progress | ☑ Complete | ⚠ Blocked

---

## PHASE 1: SALESFORCE FOUNDATION (22 items)

### 1.1 Lead Object
- [ ] 1.1.1 Lead custom fields
- [ ] 1.1.2 Lead sources picklist
- [ ] 1.1.3 Lead status values
- [ ] 1.1.4 Lead assignment rules
- [ ] 1.1.5 Lead conversion mapping
- [ ] 1.1.6 Web-to-Lead form

### 1.2 Account Object
- [ ] 1.2.1 Account record types (Prospect/Customer/Partner/Vendor)
- [ ] 1.2.2 Account custom fields (BTN, Tax ID)
- [ ] 1.2.3 Account hierarchy (Parent/Child)
- [ ] 1.2.4 Account page layouts
- [ ] 1.2.5 Account sharing rules

### 1.3 Contact Object
- [ ] 1.3.1 Contact role checkbox fields
- [ ] 1.3.2 Alarm Level picklist
- [ ] 1.3.3 Contact page layout
- [ ] 1.3.4 Contact validation rules

### 1.4 Market Object (Custom)
- [ ] 1.4.1 Market__c object creation
- [ ] 1.4.2 Market fields (Name, Labor_Rate__c)
- [ ] 1.4.3 Initial market data (Mobile, Birmingham, Other)
- [ ] 1.4.4 Market tab

### 1.5 Location Object (Custom)
- [ ] 1.5.1 Location__c object creation
- [ ] 1.5.2 Location → Account lookup (Account__c)
- [ ] 1.5.3 Location address fields (Street, City, State, Zip)
- [ ] 1.5.4 Location Type picklist
- [ ] 1.5.5 Location → Market lookups (Sales/Service)
- [ ] 1.5.6 Monitoring fields (Monitoring_Account, Platform_Account)
- [ ] 1.5.7 Alarm Permit field
- [ ] 1.5.8 Location tab
- [ ] 1.5.9 Location related list on Account

---

## PHASE 2: OPPORTUNITY & QUOTING (42 items)

### 2.1 Opportunity Object
- [ ] 2.1.1 Opportunity stages
- [ ] 2.1.2 Opportunity → Market lookup
- [ ] 2.1.3 Contact lookups (Customer, Technical, Billing)
- [ ] 2.1.4 Selected Term picklist
- [ ] 2.1.5 Loss Reason field
- [ ] 2.1.6 Opportunity page layout
- [ ] 2.1.7 Sales Path component

### 2.2 Price Book
- [ ] 2.2.1 Standard Price Book setup
- [ ] 2.2.2 Price Book activation

### 2.3 Product Catalog
- [ ] 2.3.1 Product categories (Family picklist)
- [ ] 2.3.2 Product Type field
- [ ] 2.3.3 Market availability checkboxes
- [ ] 2.3.4 Standalone flag
- [ ] 2.3.5 MRC pricing field
- [ ] 2.3.6 Vendor License lookups
- [ ] 2.3.7 Product data import

### 2.4 OpportunityLineItem
- [ ] 2.4.1 Location__c lookup field
- [ ] 2.4.2 Location validation rule
- [ ] 2.4.3 Line Item page layout

### 2.5 Vendor License System
- [ ] 2.5.1 Vendor_License__c object
- [ ] 2.5.2 License fields (MRC, NRC, Vendor)
- [ ] 2.5.3 License Cost metadata type
- [ ] 2.5.4 License data records

### 2.6 Equipment Item SKU
- [ ] 2.6.1 Equipment_Item_SKU__c object
- [ ] 2.6.2 Equipment fields (part numbers, manufacturer)
- [ ] 2.6.3 Required field flags (Serial, MAC, IMEI, ICCID, Network Key)
- [ ] 2.6.4 Labor hours field
- [ ] 2.6.5 Preferred Vendor lookup
- [ ] 2.6.6 Equipment data import

### 2.7 Vendor SKU Cost
- [ ] 2.7.1 Vendor_SKU_Cost__c object
- [ ] 2.7.2 Cost fields
- [ ] 2.7.3 Equipment lookup
- [ ] 2.7.4 Vendor pricing data

### 2.8 Product Equipment Junction
- [ ] 2.8.1 Product_Equipment__c object
- [ ] 2.8.2 Product lookup
- [ ] 2.8.3 Equipment lookup
- [ ] 2.8.4 Quantity field
- [ ] 2.8.5 Type field (Default/Optional)
- [ ] 2.8.6 Junction data

### 2.9 Account Equipment Price
- [ ] 2.9.1 Account_Equipment_Price__c object
- [ ] 2.9.2 Account lookup
- [ ] 2.9.3 Equipment lookup
- [ ] 2.9.4 Override price field

### 2.10 Campaign Integration
- [ ] 2.10.1 Campaign object setup
- [ ] 2.10.2 Campaign types
- [ ] 2.10.3 Campaign member status
- [ ] 2.10.4 Opportunity → Campaign link

---

## PHASE 3: SALESFORCE → SUPABASE INTEGRATION (14 items)

### 3.1 Apex Trigger Infrastructure
- [ ] 3.1.1 OpportunityTrigger
- [ ] 3.1.2 Trigger handler pattern
- [ ] 3.1.3 Stage change detection logic

### 3.2 RedexSyncHelper Class
- [ ] 3.2.1 @future syncToSupabase method
- [ ] 3.2.2 Opportunity query with Account/Market
- [ ] 3.2.3 Line Items query with Product Family, Location
- [ ] 3.2.4 JSON payload builder
- [ ] 3.2.5 HTTP callout to Edge Function
- [ ] 3.2.6 Category mapping helper
- [ ] 3.2.7 Error handling

### 3.3 Test Coverage
- [ ] 3.3.1 RedexSyncHelperTest class
- [ ] 3.3.2 HttpCalloutMock implementation
- [ ] 3.3.3 Test data setup
- [ ] 3.3.4 Validation rule test

### 3.4 Remote Site Settings
- [ ] 3.4.1 Supabase endpoint authorization

---

## PHASE 4: SUPABASE DATABASE & EDGE FUNCTIONS (31 items)

### 4.1 Core Tables
- [ ] 4.1.1 customers table + RLS
- [ ] 4.1.2 jobs table + RLS
- [ ] 4.1.3 site_surveys table + RLS
- [ ] 4.1.4 site_survey_items table + RLS
- [ ] 4.1.5 projects table + RLS
- [ ] 4.1.6 project_devices table + RLS
- [ ] 4.1.7 salesforce_equipment table + RLS

### 4.2 Product Dependency Tables
- [ ] 4.2.1 products table
- [ ] 4.2.2 product_dependencies table
- [ ] 4.2.3 product_choice_groups table
- [ ] 4.2.4 product_choice_options table
- [ ] 4.2.5 product_choice_dependencies table
- [ ] 4.2.6 category_hub_requirements table

### 4.3 Supporting Tables
- [ ] 4.3.1 technicians table
- [ ] 4.3.2 locations table
- [ ] 4.3.3 expenses table
- [ ] 4.3.4 field_installation_photos table
- [ ] 4.3.5 field_installation_time_entries table

### 4.4 Database Functions
- [ ] 4.4.1 get_required_products() function
- [ ] 4.4.2 calculate_head_end_equipment() function
- [ ] 4.4.3 sync_survey_item_to_project_device() trigger function

### 4.5 Database Triggers
- [ ] 4.5.1 trg_sync_survey_to_project trigger

### 4.6 Edge Function: sf-opportunity-sync
- [ ] 4.6.1 Payload validation
- [ ] 4.6.2 Customer upsert (provisional)
- [ ] 4.6.3 Job creation
- [ ] 4.6.4 Survey creation
- [ ] 4.6.5 Project creation
- [ ] 4.6.6 Line item expansion (qty → individual rows)
- [ ] 4.6.7 Category mapping
- [ ] 4.6.8 Location population from line items
- [ ] 4.6.9 Auto-dependencies (keypads, hub)
- [ ] 4.6.10 Response handling

### 4.7 Edge Function: sf-product-sync
- [ ] 4.7.1 Product upsert
- [ ] 4.7.2 Category mapping
- [ ] 4.7.3 Deactivation of removed products

### 4.8 Product Trigger (Salesforce)
- [ ] 4.8.1 ProductTrigger on Product2
- [ ] 4.8.2 ProductTriggerTest coverage

---

## PHASE 5: SURVEY MANAGEMENT UI (19 items)

### 5.1 Site Surveys List
- [ ] 5.1.1 SiteSurveys.tsx page
- [ ] 5.1.2 Status filters
- [ ] 5.1.3 Survey cards
- [ ] 5.1.4 Navigation to detail

### 5.2 Survey Detail Page
- [ ] 5.2.1 SiteSurveyDetail.tsx page
- [ ] 5.2.2 Survey header component
- [ ] 5.2.3 Items list component
- [ ] 5.2.4 Auto-save on location input

### 5.3 Survey Item Components
- [ ] 5.3.1 SurveyItemCard.tsx
- [ ] 5.3.2 SurveyItemDialog.tsx
- [ ] 5.3.3 Category icons mapping
- [ ] 5.3.4 Auto-generated badge

### 5.4 Add Item with Dependencies
- [ ] 5.4.1 AddItemDialog component
- [ ] 5.4.2 Lock type selection (Mag Lock vs Electric Strike)
- [ ] 5.4.3 survey-add-item-with-deps edge function
- [ ] 5.4.4 Dependency display (indented items)

### 5.5 Survey Completion Handler
- [ ] 5.5.1 Complete Survey button
- [ ] 5.5.2 Location validation (all items must have location)
- [ ] 5.5.3 Project creation from survey
- [ ] 5.5.4 Device sync (survey items → project devices)
- [ ] 5.5.5 Status updates (survey, job)
- [ ] 5.5.6 Navigation to project page

---

## PHASE 6: INSTALLATION TRACKING (24 items)

### 6.1 Pipeline Dashboard
- [ ] 6.1.1 InstallationPipelineWidget.tsx
- [ ] 6.1.2 Pipeline stages (6 columns)
- [ ] 6.1.3 Project cards with progress
- [ ] 6.1.4 Dashboard integration (Tech, Service, Management)

### 6.2 Project List Page
- [ ] 6.2.1 FieldInstallation.tsx page
- [ ] 6.2.2 Status filters
- [ ] 6.2.3 Search component
- [ ] 6.2.4 Sort component

### 6.3 Project Detail Page
- [ ] 6.3.1 FieldProjectDetail.tsx (8 tabs)
- [ ] 6.3.2 Overview tab
- [ ] 6.3.3 Locations tab
- [ ] 6.3.4 Devices tab
- [ ] 6.3.5 Checklists tab
- [ ] 6.3.6 Expenses tab
- [ ] 6.3.7 Photos tab
- [ ] 6.3.8 Time tab
- [ ] 6.3.9 Notes tab

### 6.4 Device Installation
- [ ] 6.4.1 DevicesList.tsx
- [ ] 6.4.2 DeviceCard component
- [ ] 6.4.3 InstallationProgressBar.tsx
- [ ] 6.4.4 Mark Installed button
- [ ] 6.4.5 Serial number input
- [ ] 6.4.6 QR/Barcode scanner

### 6.5 Device Wizards
- [ ] 6.5.1 CameraWizard
- [ ] 6.5.2 SensorWizard
- [ ] 6.5.3 AccessControlWizard
- [ ] 6.5.4 Dynamic fields based on Equipment SKU

### 6.6 Installation Completion
- [ ] 6.6.1 Complete Project button
- [ ] 6.6.2 Device validation (all must be installed)
- [ ] 6.6.3 Customer activation (provisional → active)
- [ ] 6.6.4 Device linking to customer
- [ ] 6.6.5 Status updates (project, job → complete)
- [ ] 6.6.6 Completion summary

---

## PHASE 7: POST-INSTALLATION (14 items)

### 7.1 Customer Activation Flow
- [ ] 7.1.1 Status update to 'active'
- [ ] 7.1.2 Activation date timestamp
- [ ] 7.1.3 Device in-service dates
- [ ] 7.1.4 Operations notification

### 7.2 Customer Profile Page
- [ ] 7.2.1 CustomerDetail.tsx page
- [ ] 7.2.2 Equipment list with serials
- [ ] 7.2.3 Service history
- [ ] 7.2.4 Contact info with roles

### 7.3 Service Ticket System
- [ ] 7.3.1 Ticket creation
- [ ] 7.3.2 Ticket assignment
- [ ] 7.3.3 Ticket status tracking
- [ ] 7.3.4 Ticket resolution

### 7.4 Reporting & Analytics
- [ ] 7.4.1 Installation metrics dashboard
- [ ] 7.4.2 Revenue tracking reports
- [ ] 7.4.3 Technician performance reports
- [ ] 7.4.4 Customer health dashboard

---

## SUMMARY TOTALS

| Phase | Items | Complete | % |
|-------|-------|----------|---|
| 1. SF Foundation | 22 | ___ | ___% |
| 2. Opportunity/Quoting | 42 | ___ | ___% |
| 3. SF→Supabase Integration | 14 | ___ | ___% |
| 4. Supabase DB/Edge Functions | 31 | ___ | ___% |
| 5. Survey Management UI | 19 | ___ | ___% |
| 6. Installation Tracking | 24 | ___ | ___% |
| 7. Post-Installation | 14 | ___ | ___% |
| **TOTAL** | **166** | ___ | ___% |

---

*Fill in status and return for next steps*
