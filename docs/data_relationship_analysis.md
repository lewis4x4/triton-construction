# RedeX Data Relationship Analysis
## Generated: 2025-11-29

---

## 🚨 CRITICAL FINDING: Two Parallel Data Systems

Your database has **TWO completely separate data systems** that are not connected:

### System 1: Billing Jobs (Standalone)
| Table | Count | Purpose |
|-------|-------|---------|
| `billing_jobs` | **304** | Completed job records from Fulcrum/field work |

- Contains: location, store_number, technician, job_date, job_scope, total_billable
- **NOT LINKED** to jobs, projects, or surveys tables
- Source: Imported from external system (Fulcrum)

### System 2: Operational Pipeline (Linked but Empty Jobs)
| Table | Count | Has Relationships |
|-------|-------|-------------------|
| `jobs` | **0** | Yes - should link everything |
| `projects` | **661** | 217 have surveys, 444 don't |
| `site_surveys` | **218** | 216 have job_id (but jobs is empty!) |
| `special_project_stores` | **222** | Should link to jobs |

---

## Data Counts Summary

```
┌─────────────────────────┬───────┬─────────────────────────────┐
│ Table                   │ Count │ Notes                       │
├─────────────────────────┼───────┼─────────────────────────────┤
│ billing_jobs            │ 304   │ Actual job data (standalone)│
│ jobs                    │ 0     │ EMPTY - relationship hub    │
│ projects                │ 661   │ 444 orphaned (no survey)    │
│ site_surveys            │ 218   │ 216 have broken job_id refs │
│ special_project_stores  │ 222   │ Store inventory             │
└─────────────────────────┴───────┴─────────────────────────────┘
```

---

## Root Cause Analysis

### Why the numbers don't match:

1. **billing_jobs (304)** came from Fulcrum import
   - Contains completed billing records
   - Not integrated into the operational pipeline
   - Different schema than `jobs` table

2. **jobs (0)** is the "hub" table that should connect everything
   - Has foreign keys to: projects, site_surveys, special_project_stores
   - Currently EMPTY - nothing was created here

3. **projects (661)** were auto-generated
   - 444 projects have no survey link (orphaned)
   - Created by automation but not linked to jobs

4. **site_surveys (218)** reference non-existent jobs
   - job_id column has UUIDs but `jobs` table is empty
   - These are "dangling references"

---

## Recommended Cleanup Strategy

### Option A: Migrate billing_jobs → jobs (Recommended)
1. Create jobs records from billing_jobs data
2. Match billing_jobs to special_project_stores by store_number
3. Link projects and surveys to new job records
4. Keep billing_jobs as historical/billing archive

### Option B: Use billing_jobs as primary
1. Update all queries to use billing_jobs instead of jobs
2. Add foreign keys to billing_jobs table
3. Deprecate empty jobs table

### Option C: Clean slate
1. Delete orphaned projects (444 without surveys)
2. Delete site_surveys with broken job references
3. Rebuild from billing_jobs as source of truth

---

## Detailed Breakdown

### billing_jobs by Region
| Region | Jobs | Unique Stores |
|--------|------|---------------|
| AZ | ~80 | Arizona stores |
| CA | ~60 | California stores |
| FL | ~40 | Florida stores |
| TX | ~30 | Texas stores |
| Others | ~94 | Various states |

### Projects Status
- **With Survey**: 217 (33%)
- **Without Survey**: 444 (67%) - ORPHANED

### Site Surveys Status
- **With job_id**: 216 (99%) - but jobs table is empty!
- **Without job_id**: 2 (1%)

---

## Next Steps

1. **Decide on cleanup approach** (A, B, or C above)
2. **Export data for backup** before any changes
3. **Run migration script** to consolidate
4. **Verify data integrity** after cleanup
