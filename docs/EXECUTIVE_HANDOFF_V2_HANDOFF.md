# CLAUDE CODE HANDOFF
## Executive Bid Handoff V2 — AI Intelligence Enhancements

**Date:** December 15, 2025  
**Status:** Ready for Implementation  
**Priority:** HIGH — POC Deliverable Enhancement  
**Prepared By:** Brian Lewis  
**For:** Claude Code Development Team

---

## EXECUTIVE SUMMARY

The current Executive Bid Handoff (V1) provides a solid foundation but lacks the deep AI intelligence that differentiates Triton's platform. This specification defines V2 enhancements that transform the handoff from a "document summary" into a "strategic bid decision engine."

### Current State (V1) — What's Working
- ✅ Basic project metrics dashboard
- ✅ Line item extraction and display
- ✅ Work package categorization framework
- ✅ Risk identification (manual)
- ✅ Document inventory tracking
- ✅ Professional PDF output format

### Gaps Identified (V1 Issues)
- ❌ Work packages show $0 values (pricing not flowing)
- ❌ 0 Value Engineering opportunities generated
- ❌ 0 Pre-Bid Questions auto-generated
- ❌ Risk count inconsistency (says "0" but lists 8)
- ❌ All 55 items categorized as "OTHER" (no intelligence)
- ❌ No historical comparison or benchmarking
- ❌ No competitive intelligence
- ❌ No confidence scoring on AI outputs
- ❌ No data quality indicators
- ❌ No bid strategy recommendations

### V2 Vision — What We're Building
A comprehensive bid decision package that provides:
1. **AI Confidence Scoring** on every recommendation
2. **Historical Benchmarking** against similar past projects
3. **Competitive Intelligence** based on market conditions
4. **Cash Flow Projections** with financing analysis
5. **Weather Window Analysis** for critical path activities
6. **Bid Strategy Engine** with pricing scenarios
7. **Data Quality Dashboard** showing completeness metrics
8. **Interactive Risk Heat Map** with mitigation costs

---

## PART 1: NEW SECTIONS TO ADD

### 1.1 AI Confidence Dashboard (NEW SECTION)

**Purpose:** Show estimators exactly how reliable each AI output is.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI CONFIDENCE DASHBOARD                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  OVERALL ANALYSIS CONFIDENCE: 72% MEDIUM                                    │
│  ════════════════════════════════════════════════                           │
│                                                                             │
│  Component Scores:                                                          │
│  ┌─────────────────────┬────────┬────────────────────────────────────────┐ │
│  │ Document Extraction │  89%   │ ████████████████████░░░░  HIGH         │ │
│  │ Risk Identification │  78%   │ ███████████████░░░░░░░░░  MEDIUM       │ │
│  │ Cost Estimates      │  45%   │ █████████░░░░░░░░░░░░░░░  LOW          │ │
│  │ Work Packages       │  82%   │ ████████████████░░░░░░░░  HIGH         │ │
│  │ Schedule Analysis   │  23%   │ █████░░░░░░░░░░░░░░░░░░░  VERY LOW     │ │
│  └─────────────────────┴────────┴────────────────────────────────────────┘ │
│                                                                             │
│  Data Completeness:                                                         │
│  • Plans Readable: NO ⚠️ (26.1MB PDF failed extraction)                    │
│  • Contract Days: NOT SPECIFIED ⚠️                                         │
│  • Liquidated Damages: NOT SPECIFIED ⚠️                                    │
│  • Asbestos Report: COMPLETE ✓                                             │
│  • Environmental Docs: COMPLETE ✓                                          │
│  • BIDX/EBSX: COMPLETE ✓                                                   │
│                                                                             │
│  Confidence Limiting Factors:                                               │
│  1. Missing contract time prevents schedule-based risk quantification       │
│  2. Existing plans unreadable - cannot verify quantities or conditions      │
│  3. No historical data for similar Lincoln County bridge projects           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Database Schema:**

```sql
-- Add to bid_proposals table
ALTER TABLE bid_proposals ADD COLUMN IF NOT EXISTS
    ai_analysis_metadata JSONB DEFAULT '{}'::jsonb;

-- Structure of ai_analysis_metadata:
{
  "overall_confidence": 0.72,
  "confidence_level": "MEDIUM",
  "component_scores": {
    "document_extraction": {"score": 0.89, "level": "HIGH", "limiting_factors": []},
    "risk_identification": {"score": 0.78, "level": "MEDIUM", "limiting_factors": ["existing_plans_unreadable"]},
    "cost_estimates": {"score": 0.45, "level": "LOW", "limiting_factors": ["no_historical_data", "missing_productivity_factors"]},
    "work_packages": {"score": 0.82, "level": "HIGH", "limiting_factors": []},
    "schedule_analysis": {"score": 0.23, "level": "VERY_LOW", "limiting_factors": ["contract_days_missing", "no_baseline_schedule"]}
  },
  "data_completeness": {
    "plans_readable": false,
    "contract_days_specified": false,
    "liquidated_damages_specified": false,
    "asbestos_report_complete": true,
    "environmental_docs_complete": true,
    "bidx_ebsx_complete": true
  },
  "analyzed_at": "2025-12-15T14:05:00Z",
  "model_version": "claude-3-5-sonnet-20241022"
}
```

---

### 1.2 Historical Benchmarking Section (NEW)

**Purpose:** Compare this bid to similar past Triton projects.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      HISTORICAL BENCHMARKING                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SIMILAR PAST PROJECTS (3 found):                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ 1. Route 60 Bridge Rehab (2023) — Cabell County                      │  │
│  │    • Contract: $4.2M | Actual: $4.8M (+14%)                          │  │
│  │    • Duration: 240 days | Actual: 285 days (+19%)                    │  │
│  │    • Scope: LMC overlay, steel repairs, deck patching                │  │
│  │    • Key Learning: Steel condition worse than plans showed           │  │
│  │    • Similarity Score: 87%                                           │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │ 2. Kanawha River Bridge Paint (2022) — Kanawha County               │  │
│  │    • Contract: $2.1M | Actual: $2.3M (+10%)                          │  │
│  │    • Duration: 180 days | Actual: 195 days (+8%)                     │  │
│  │    • Scope: Lead paint removal, containment, recoating               │  │
│  │    • Key Learning: Containment costs exceeded estimate by 25%        │  │
│  │    • Similarity Score: 72%                                           │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │ 3. Guyandotte River Bridge Demo (2024) — Lincoln County             │  │
│  │    • Contract: $1.8M | Actual: $1.7M (-6%)                           │  │
│  │    • Duration: 120 days | Actual: 118 days (-2%)                     │  │
│  │    • Scope: Full demo, temporary access, marine work                 │  │
│  │    • Key Learning: River access during spring runoff critical        │  │
│  │    • Similarity Score: 68%                                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  UNIT PRICE BENCHMARKING (vs. Historical Average):                          │
│  ┌────────────────────────────────────────────┬──────────┬────────┬──────┐ │
│  │ Item                                       │ Proposed │ Avg    │ Var  │ │
│  ├────────────────────────────────────────────┼──────────┼────────┼──────┤ │
│  │ 688.1 Clean/Paint Steel (LS)               │ $650,000 │ $580K  │ +12% │ │
│  │ 679.1 Concrete Deck Overlay (SY)           │ $356     │ $325   │ +10% │ │
│  │ 601.30 Patching Concrete (SF)              │ $320     │ $285   │ +12% │ │
│  │ 601.9 Class H Concrete (CY)                │ $3,400   │ $3,100 │ +10% │ │
│  │ 204.1 Mobilization (LS)                    │ $288,000 │ 8.0%   │ OK   │ │
│  └────────────────────────────────────────────┴──────────┴────────┴──────┘ │
│                                                                             │
│  ⚠️ AI INSIGHT: Proposed prices run 10-12% above historical average.       │
│     Recommendation: Review if this reflects current material costs or      │
│     potential for price reduction in competitive market.                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Database Schema:**

```sql
-- New table for historical project comparisons
CREATE TABLE bid_historical_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES bid_proposals(id),
    historical_project_id UUID REFERENCES projects(id),
    
    -- Comparison metrics
    similarity_score NUMERIC(5,2),           -- 0-100%
    similarity_factors JSONB,                 -- What made it similar
    
    -- Historical outcomes
    historical_contract_amount NUMERIC(18,2),
    historical_actual_amount NUMERIC(18,2),
    historical_contract_days INTEGER,
    historical_actual_days INTEGER,
    cost_variance_percent NUMERIC(5,2),
    schedule_variance_percent NUMERIC(5,2),
    
    -- Learning
    key_learnings TEXT[],
    risk_factors_discovered TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unit price benchmark table
CREATE TABLE bid_unit_price_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES bid_proposals(id),
    line_item_id UUID REFERENCES proposal_line_items(id),
    
    wvdoh_item_code TEXT NOT NULL,
    proposed_unit_price NUMERIC(18,4),
    historical_avg_price NUMERIC(18,4),
    historical_min_price NUMERIC(18,4),
    historical_max_price NUMERIC(18,4),
    sample_count INTEGER,
    variance_percent NUMERIC(5,2),
    
    -- AI assessment
    price_assessment TEXT,                   -- 'COMPETITIVE', 'HIGH', 'LOW', 'AGGRESSIVE'
    assessment_rationale TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 1.3 Competitive Intelligence Section (NEW)

**Purpose:** Market analysis and competitor positioning.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPETITIVE INTELLIGENCE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MARKET CONDITIONS:                                                         │
│  • Bridge Rehabilitation Market: MODERATE activity in WV                    │
│  • Competition Level: MEDIUM-HIGH (4-6 expected bidders)                    │
│  • Material Costs: Steel +8% YoY, Concrete +5% YoY                         │
│  • Labor Availability: TIGHT for bridge-qualified crews                     │
│                                                                             │
│  LIKELY COMPETITORS (based on recent WVDOH bridge awards):                  │
│  ┌────────────────────────┬────────────┬────────────────────────────────┐  │
│  │ Contractor             │ Win Rate   │ Recent Activity                │  │
│  ├────────────────────────┼────────────┼────────────────────────────────┤  │
│  │ Orders Construction    │ 35%        │ Won Rt 35 Bridge ($5.2M)       │  │
│  │ Kokosing               │ 28%        │ Active on 3 WVDOH bridges      │  │
│  │ Bizzack Construction   │ 22%        │ Aggressive on steel work       │  │
│  │ Vecellio & Grogan      │ 15%        │ Lower volume, specialty focus  │  │
│  └────────────────────────┴────────────┴────────────────────────────────┘  │
│                                                                             │
│  ENGINEER'S ESTIMATE ANALYSIS:                                              │
│  • Published Estimate: $3,594,298                                           │
│  • Historical Winning Bid vs EE: -3% to -12%                               │
│  • Suggested Target Range: $3,163,000 - $3,486,000                         │
│                                                                             │
│  BID STRATEGY RECOMMENDATION:                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BALANCED APPROACH — Target: $3,350,000 (-7%)                        │   │
│  │                                                                      │   │
│  │ Rationale:                                                           │   │
│  │ • Lead paint work favors experienced contractors (barrier to entry) │   │
│  │ • Semi-integral abutment conversion is specialty work               │   │
│  │ • 0% DBE goal reduces subcontractor complexity                      │   │
│  │ • Two-phase traffic control adds coordination overhead              │   │
│  │                                                                      │   │
│  │ Risk Tolerance: MEDIUM — Room to adjust pricing if needed           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Database Schema:**

```sql
-- Competitive analysis table
CREATE TABLE bid_competitive_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES bid_proposals(id),
    
    -- Market conditions
    market_activity_level TEXT,              -- HIGH, MODERATE, LOW
    expected_bidder_count_low INTEGER,
    expected_bidder_count_high INTEGER,
    competition_level TEXT,                   -- HIGH, MEDIUM-HIGH, MEDIUM, LOW
    
    -- Material/labor market
    material_cost_trends JSONB,
    labor_availability TEXT,
    
    -- Competitor intelligence
    likely_competitors JSONB,                 -- Array of competitor objects
    
    -- Strategy
    ee_analysis JSONB,
    suggested_target_low NUMERIC(18,2),
    suggested_target_high NUMERIC(18,2),
    recommended_strategy TEXT,
    strategy_rationale TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Structure of likely_competitors JSONB:
[
  {
    "name": "Orders Construction",
    "win_rate": 0.35,
    "recent_activity": "Won Rt 35 Bridge ($5.2M)",
    "strengths": ["steel work", "large projects"],
    "weaknesses": ["smaller bridge rehab"],
    "threat_level": "HIGH"
  }
]
```

---

### 1.4 Cash Flow Projection Section (NEW)

**Purpose:** Financial planning for project execution.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CASH FLOW PROJECTION                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ASSUMPTIONS:                                                               │
│  • Contract Duration: 240 days (estimated — NOT CONFIRMED)                  │
│  • Mobilization Front-Load: 50% in Month 1, 50% in Month 2                 │
│  • Pay Application Cycle: 30 days                                           │
│  • State Payment: 30-45 days after approval                                │
│  • Retainage: 5% until substantial completion                               │
│                                                                             │
│  MONTHLY PROJECTION:                                                        │
│  ┌────────┬────────────┬────────────┬────────────┬────────────┬──────────┐ │
│  │ Month  │ Costs      │ Billing    │ Cash In    │ Net Cash   │ Cumul.   │ │
│  ├────────┼────────────┼────────────┼────────────┼────────────┼──────────┤ │
│  │ 1      │ ($485,000) │ $288,000   │ $0         │ ($485,000) │($485,000)│ │
│  │ 2      │ ($520,000) │ $580,000   │ $273,600   │ ($246,400) │($731,400)│ │
│  │ 3      │ ($480,000) │ $450,000   │ $551,000   │ $71,000    │($660,400)│ │
│  │ 4      │ ($420,000) │ $520,000   │ $427,500   │ $7,500     │($652,900)│ │
│  │ 5      │ ($380,000) │ $480,000   │ $494,000   │ $114,000   │($538,900)│ │
│  │ 6      │ ($350,000) │ $420,000   │ $456,000   │ $106,000   │($432,900)│ │
│  │ 7      │ ($280,000) │ $380,000   │ $399,000   │ $119,000   │($313,900)│ │
│  │ 8      │ ($180,000) │ $476,298   │ $361,000   │ $181,000   │($132,900)│ │
│  │ Final  │ —          │ Retainage  │ $179,715   │ $179,715   │ $46,815  │ │
│  └────────┴────────────┴────────────┴────────────┴────────────┴──────────┘ │
│                                                                             │
│  KEY METRICS:                                                               │
│  • Peak Cash Requirement: $731,400 (Month 2)                               │
│  • Breakeven Month: Month 8                                                 │
│  • Retainage at Risk: $179,715                                             │
│  • Projected Margin: $46,815 (1.3% of contract)                            │
│                                                                             │
│  ⚠️ WARNING: Peak cash requirement high relative to contract value.        │
│     Consider: Mobilization front-loading, supplier terms, equipment timing  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Database Schema:**

```sql
-- Cash flow projection table
CREATE TABLE bid_cash_flow_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES bid_proposals(id),
    
    -- Assumptions
    assumed_duration_days INTEGER,
    mobilization_front_load_pct NUMERIC(5,2),
    pay_app_cycle_days INTEGER,
    state_payment_days INTEGER,
    retainage_percent NUMERIC(5,2),
    
    -- Summary metrics
    peak_cash_requirement NUMERIC(18,2),
    peak_cash_month INTEGER,
    breakeven_month INTEGER,
    retainage_at_risk NUMERIC(18,2),
    projected_margin_dollars NUMERIC(18,2),
    projected_margin_percent NUMERIC(5,2),
    
    -- Monthly detail
    monthly_projections JSONB,
    
    -- Warnings
    warnings TEXT[],
    recommendations TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Structure of monthly_projections JSONB:
[
  {
    "month": 1,
    "costs": -485000,
    "billing": 288000,
    "cash_in": 0,
    "net_cash": -485000,
    "cumulative": -485000
  }
]
```

---

### 1.5 Weather Window Analysis (NEW)

**Purpose:** Schedule risk based on weather-sensitive activities.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      WEATHER WINDOW ANALYSIS                                │
│                      Lincoln County, WV                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CRITICAL WEATHER-SENSITIVE ACTIVITIES:                                     │
│  ┌─────────────────────────────────┬────────────────────────────────────┐  │
│  │ Activity                        │ Weather Constraint                 │  │
│  ├─────────────────────────────────┼────────────────────────────────────┤  │
│  │ LMC Deck Overlay (679.1)        │ >40°F, no precip, low humidity     │  │
│  │ Bridge Painting (688.1)         │ >50°F, <85% RH, no precip 24hr     │  │
│  │ Concrete Placement (601.x)      │ >40°F, no precip during cure       │  │
│  │ Steel Work (615.x)              │ Dry conditions, <25mph wind        │  │
│  └─────────────────────────────────┴────────────────────────────────────┘  │
│                                                                             │
│  OPTIMAL WORK WINDOWS (Historical Weather Data):                            │
│  ┌────────────────────────────────────────────────────────────────────────┐│
│  │ Jan │ Feb │ Mar │ Apr │ May │ Jun │ Jul │ Aug │ Sep │ Oct │ Nov │ Dec ││
│  │ ░░░ │ ░░░ │ ▓▓░ │ ▓▓▓ │ ███ │ ███ │ ███ │ ███ │ ███ │ ▓▓▓ │ ▓▓░ │ ░░░ ││
│  │  8  │ 10  │ 14  │ 18  │ 22  │ 24  │ 26  │ 25  │ 22  │ 18  │ 13  │  9  ││
│  │ days│days │days │days │days │days │days │days │days │days │days │days ││
│  └────────────────────────────────────────────────────────────────────────┘│
│  Legend: ███ Optimal (20+ days)  ▓▓▓ Good (15-19)  ▓▓░ Fair (10-14)  ░░░ Poor│
│                                                                             │
│  GUYANDOTTE RIVER CONSIDERATIONS:                                           │
│  • Spring runoff (Mar-Apr): River levels elevated, limit barge access      │
│  • Summer low water (Jul-Aug): Best for in-water work                      │
│  • Fall rain events: Flash flooding risk in narrow valley                  │
│                                                                             │
│  SCHEDULE RECOMMENDATION:                                                   │
│  • Ideal Start: April 1 — Maximize good weather window                     │
│  • Critical Path: Complete deck overlay by October 15                      │
│  • Paint Work: Schedule for May-September only                             │
│  • Float Required: 15-20 weather days built into schedule                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.6 Bid Strategy Engine (NEW)

**Purpose:** Multiple pricing scenarios with trade-offs.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BID STRATEGY ENGINE                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  THREE PRICING SCENARIOS:                                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ CONSERVATIVE — "Sleep Well" — $3,594,298 (at EE)                    │   │
│  │                                                                      │   │
│  │ Markup: 15%  |  Contingency: 8%  |  Win Probability: 15%            │   │
│  │                                                                      │   │
│  │ Pros: Full risk coverage, comfortable execution                     │   │
│  │ Cons: Low probability of winning                                    │   │
│  │ Best If: Known issues in plans, aggressive competitors unlikely     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ BALANCED — "RECOMMENDED" — $3,350,000 (-7% from EE)                 │   │
│  │                                                                      │   │
│  │ Markup: 12%  |  Contingency: 5%  |  Win Probability: 45%            │   │
│  │                                                                      │   │
│  │ Pros: Competitive while maintaining margin                          │   │
│  │ Cons: Moderate risk if unforeseen conditions                        │   │
│  │ Best If: Standard project, experienced team available               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ AGGRESSIVE — "Buy the Work" — $3,163,000 (-12% from EE)             │   │
│  │                                                                      │   │
│  │ Markup: 8%  |  Contingency: 3%  |  Win Probability: 75%             │   │
│  │                                                                      │   │
│  │ Pros: High win probability, keeps crews busy                        │   │
│  │ Cons: Thin margin, CO pursuit critical                              │   │
│  │ Best If: Need backlog, strong CO opportunity identified             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  UNBALANCING OPPORTUNITIES:                                                 │
│  ┌────────────────────────────────┬─────────────┬────────────────────────┐ │
│  │ Item                           │ Opportunity │ Strategy               │ │
│  ├────────────────────────────────┼─────────────┼────────────────────────┤ │
│  │ 204.1 Mobilization             │ Front-load  │ Price at 10% vs 8%     │ │
│  │ 212.10 Shoring                 │ Early work  │ Increase 15%           │ │
│  │ 601.30 Patching (exploratory)  │ Qty increase│ Price high, expect CO  │ │
│  │ 636.23 Temp Traffic Signal     │ Duration    │ 24 MO may extend       │ │
│  └────────────────────────────────┴─────────────┴────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Database Schema:**

```sql
-- Bid pricing scenarios
CREATE TABLE bid_pricing_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES bid_proposals(id),
    
    scenario_name TEXT NOT NULL,             -- 'CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'
    scenario_label TEXT,                      -- 'Sleep Well', 'Recommended', 'Buy the Work'
    
    total_bid_amount NUMERIC(18,2),
    variance_from_ee_percent NUMERIC(5,2),
    markup_percent NUMERIC(5,2),
    contingency_percent NUMERIC(5,2),
    estimated_win_probability NUMERIC(5,2),
    
    pros TEXT[],
    cons TEXT[],
    best_if TEXT,
    
    is_recommended BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unbalancing opportunities
CREATE TABLE bid_unbalancing_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES bid_proposals(id),
    line_item_id UUID REFERENCES proposal_line_items(id),
    
    wvdoh_item_code TEXT,
    item_description TEXT,
    opportunity_type TEXT,                   -- 'FRONT_LOAD', 'QTY_INCREASE', 'DURATION_EXTEND'
    
    current_unit_price NUMERIC(18,4),
    suggested_unit_price NUMERIC(18,4),
    adjustment_percent NUMERIC(5,2),
    
    rationale TEXT,
    risk_level TEXT,                         -- 'LOW', 'MEDIUM', 'HIGH'
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 1.7 Self-Perform vs Subcontract Analysis (NEW)

**Purpose:** Resource planning and subcontractor strategy.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SELF-PERFORM VS SUBCONTRACT ANALYSIS                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  WORK PACKAGE STRATEGY:                                                     │
│  ┌──────────────────────────────┬───────────┬────────────┬───────────────┐ │
│  │ Work Package                 │ Value     │ Strategy   │ Rationale     │ │
│  ├──────────────────────────────┼───────────┼────────────┼───────────────┤ │
│  │ Bridge Cleaning/Painting     │ $690,000  │ SUBCONTRACT│ Lead cert req │ │
│  │ Concrete Deck Overlay        │ $434,320  │ SELF-PERF  │ Core competency│ │
│  │ Structural Steel Repairs     │ $133,563  │ HYBRID     │ Fab sub, erect│ │
│  │ Demolition/Shoring           │ $823,700  │ SELF-PERF  │ Control/timing│ │
│  │ Concrete Patching            │ $352,640  │ SELF-PERF  │ Core competency│ │
│  │ Traffic Control              │ $94,000   │ SUBCONTRACT│ Specialty     │ │
│  │ Paving/Milling               │ $65,000   │ SELF-PERF  │ Have equipment│ │
│  │ Guardrail                    │ $18,598   │ SUBCONTRACT│ Specialty     │ │
│  │ Pavement Markings            │ $13,750   │ SUBCONTRACT│ Small scope   │ │
│  │ Electrical/Conduit           │ $8,000    │ SUBCONTRACT│ Licensed req  │ │
│  └──────────────────────────────┴───────────┴────────────┴───────────────┘ │
│                                                                             │
│  SUMMARY:                                                                   │
│  • Self-Perform: $1,809,000 (50%)                                          │
│  • Subcontract: $805,000 (22%)                                             │
│  • Hybrid: $134,000 (4%)                                                   │
│  • Materials/Other: $846,000 (24%)                                         │
│                                                                             │
│  KEY SUBCONTRACTOR NEEDS:                                                   │
│  1. Bridge Painting (Lead Certified) — Get 3 quotes by bid date            │
│  2. Traffic Control — Verify availability for 24-month signal rental       │
│  3. Guardrail — Standard, use preferred sub                                │
│                                                                             │
│  CREW REQUIREMENTS (Self-Perform Peak):                                     │
│  • Bridge Superintendent: 1                                                │
│  • Cement Masons: 4                                                        │
│  • Carpenters: 3                                                           │
│  • Laborers: 6                                                             │
│  • Equipment Operators: 3                                                  │
│  • Total Peak: 17 personnel                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 1.8 Pre-Bid Questions Generator (ENHANCED)

**Purpose:** Auto-generate clarification requests from risk analysis.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PRE-BID QUESTIONS (AI-GENERATED)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  6 questions generated from document analysis:                              │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Q1: CONTRACT TIME — CRITICAL                                        │   │
│  │                                                                      │   │
│  │ Question: What is the contract completion time in calendar/working  │   │
│  │ days and what are the liquidated damages per day?                   │   │
│  │                                                                      │   │
│  │ Spec Reference: Not found in provided documents                     │   │
│  │ Risk if Unresolved: Cannot price schedule-related costs/risks       │   │
│  │ Suggested Due Date: Pre-bid meeting                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Q2: EXISTING STEEL CONDITION — HIGH                                 │   │
│  │                                                                      │   │
│  │ Question: Are recent steel condition inspection reports available   │   │
│  │ beyond the existing plans? Specifically, what is the extent of      │   │
│  │ section loss in the steel beams requiring repair?                   │   │
│  │                                                                      │   │
│  │ Spec Reference: Item 615.26 Fabricated Structural Steel             │   │
│  │ Risk if Unresolved: 1,885 LB may underestimate actual repairs       │   │
│  │ Suggested Due Date: Pre-bid meeting                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Q3: LEAD PAINT EXTENT — MEDIUM                                      │   │
│  │                                                                      │   │
│  │ Question: What percentage of the existing paint system is confirmed │   │
│  │ lead-based? Is a detailed lead paint survey available?              │   │
│  │                                                                      │   │
│  │ Spec Reference: Environmental Document (Lead Paint Present)         │   │
│  │ Risk if Unresolved: Containment scope may vary significantly        │   │
│  │ Suggested Due Date: 7 days before bid                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Q4: SEMI-INTEGRAL ABUTMENT DETAILS — MEDIUM                         │   │
│  │                                                                      │   │
│  │ Question: Please clarify the semi-integral abutment conversion      │   │
│  │ requirements. Are design drawings available for the new bearing     │   │
│  │ and approach slab connection details?                               │   │
│  │                                                                      │   │
│  │ Spec Reference: Item 615.29 Non-Guided Bearing (10 EA)              │   │
│  │ Risk if Unresolved: Specialized work may require design-build       │   │
│  │ Suggested Due Date: 14 days before bid                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Q5: TRAFFIC PHASING DETAILS — MEDIUM                                │   │
│  │                                                                      │   │
│  │ Question: Please provide the traffic control plan showing the two   │   │
│  │ construction phases. What is the minimum lane width and are there   │   │
│  │ any time-of-day restrictions for single-lane operations?            │   │
│  │                                                                      │   │
│  │ Spec Reference: Two-Phase Construction noted in documents           │   │
│  │ Risk if Unresolved: Phase transitions may cause delays              │   │
│  │ Suggested Due Date: Pre-bid meeting                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Q6: RIVER ACCESS — LOW                                              │   │
│  │                                                                      │   │
│  │ Question: Is barge access available for equipment and materials,    │   │
│  │ or is all work to be performed from the bridge deck and approaches? │   │
│  │                                                                      │   │
│  │ Spec Reference: Bridge over Guyandotte River                        │   │
│  │ Risk if Unresolved: May require temporary access road               │   │
│  │ Suggested Due Date: 14 days before bid                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Export to Excel for WVDOH Submission]                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Database Schema:**

```sql
-- Pre-bid questions table
CREATE TABLE bid_prebid_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES bid_proposals(id),
    
    question_number INTEGER,
    priority TEXT NOT NULL,                  -- 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'
    category TEXT,                           -- 'CONTRACT', 'TECHNICAL', 'ENVIRONMENTAL', etc.
    
    question_text TEXT NOT NULL,
    spec_reference TEXT,
    related_line_item_id UUID REFERENCES proposal_line_items(id),
    
    risk_if_unresolved TEXT,
    suggested_due_date DATE,
    
    -- Response tracking
    submitted_date DATE,
    response_received_date DATE,
    response_text TEXT,
    impact_on_bid TEXT,
    
    -- AI metadata
    is_ai_generated BOOLEAN DEFAULT TRUE,
    generation_rationale TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 1.9 Value Engineering Opportunities (ENHANCED)

**Purpose:** Cost reduction ideas with quantified savings.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VALUE ENGINEERING OPPORTUNITIES                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  4 opportunities identified — Total Potential Savings: $85,000 - $145,000  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ VE-1: DECK OVERLAY METHOD — Potential: $35,000-$50,000              │   │
│  │ Feasibility: MEDIUM | Risk: LOW | Approval Required: YES            │   │
│  │                                                                      │   │
│  │ Current: LMC deck overlay (Item 679.1) — $356/SY                    │   │
│  │ Alternative: High-performance concrete overlay                       │   │
│  │                                                                      │   │
│  │ Analysis: HPC overlay may provide faster cure time, reducing        │   │
│  │ traffic control duration. Requires WVDOH approval as equivalent.    │   │
│  │                                                                      │   │
│  │ Action: Submit for approval if pursuing                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ VE-2: TRAFFIC SIGNAL DURATION — Potential: $18,000-$27,000          │   │
│  │ Feasibility: HIGH | Risk: LOW | Approval Required: NO               │   │
│  │                                                                      │   │
│  │ Current: 24 MO portable traffic signal rental                       │   │
│  │ Alternative: Purchase signals, resell after project                 │   │
│  │                                                                      │   │
│  │ Analysis: At $1,500/MO × 24 = $36,000 rental. Purchase at $18,000,  │   │
│  │ resell at $9,000 = $27,000 total. Savings: $9,000-$18,000          │   │
│  │                                                                      │   │
│  │ Action: Get purchase quotes from supplier                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ VE-3: PAINT SYSTEM SPECIFICATION — Potential: $25,000-$45,000       │   │
│  │ Feasibility: LOW | Risk: MEDIUM | Approval Required: YES            │   │
│  │                                                                      │   │
│  │ Current: Full 3-coat system assumed                                 │   │
│  │ Alternative: 2-coat high-build system if existing prep adequate     │   │
│  │                                                                      │   │
│  │ Analysis: Depends on existing paint adhesion test results. If       │   │
│  │ substrate sound, 2-coat system reduces material and labor.          │   │
│  │                                                                      │   │
│  │ Action: Request paint adhesion test data                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ VE-4: SHORING METHOD — Potential: $7,000-$23,000                    │   │
│  │ Feasibility: MEDIUM | Risk: MEDIUM | Approval Required: NO          │   │
│  │                                                                      │   │
│  │ Current: $110,000 LS for shoring                                    │   │
│  │ Alternative: Optimize shoring sequence with phasing                 │   │
│  │                                                                      │   │
│  │ Analysis: If traffic phases align with structural phases, may       │   │
│  │ reduce shoring quantities by reusing between phases.                │   │
│  │                                                                      │   │
│  │ Action: Develop detailed shoring plan during estimating             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 2: EXISTING SECTIONS — FIXES REQUIRED

### 2.1 Risk Assessment Matrix — Fix Inconsistencies

**Current Issue:** Text says "0 identified risks" but lists 8 risks.

**Fix Required:**
```typescript
// In risk summary component
const riskSummary = {
  total: risks.length,
  critical: risks.filter(r => r.severity === 'CRITICAL').length,
  high: risks.filter(r => r.severity === 'HIGH').length,
  medium: risks.filter(r => r.severity === 'MEDIUM').length,
  low: risks.filter(r => r.severity === 'LOW').length
};

// AI Analysis text should reference actual counts
const aiAnalysisText = `Risk analysis identified ${riskSummary.total} risks: 
  ${riskSummary.critical} critical, ${riskSummary.high} high, 
  ${riskSummary.medium} medium, ${riskSummary.low} low.`;
```

### 2.2 Work Packages — Populate Values

**Current Issue:** All 11 work packages show $0 value.

**Fix Required:**
```sql
-- Function to calculate work package totals
CREATE OR REPLACE FUNCTION calculate_work_package_totals(p_proposal_id UUID)
RETURNS TABLE (
    package_id UUID,
    package_name TEXT,
    item_count INTEGER,
    total_value NUMERIC(18,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wp.id,
        wp.name,
        COUNT(wpi.line_item_id)::INTEGER,
        COALESCE(SUM(pli.total_price), 0)
    FROM work_packages wp
    LEFT JOIN work_package_items wpi ON wp.id = wpi.work_package_id
    LEFT JOIN proposal_line_items pli ON wpi.line_item_id = pli.id
    WHERE wp.proposal_id = p_proposal_id
    GROUP BY wp.id, wp.name
    ORDER BY wp.sort_order;
END;
$$ LANGUAGE plpgsql;
```

### 2.3 Line Item Categorization — Replace "OTHER"

**Current Issue:** All 55 items categorized as "OTHER."

**Fix Required:**
```sql
-- Auto-categorization based on item code prefix
UPDATE proposal_line_items pli
SET category = CASE
    WHEN wvdoh_item_code LIKE '2%' THEN 'SITE_WORK'
    WHEN wvdoh_item_code LIKE '3%' THEN 'AGGREGATE'
    WHEN wvdoh_item_code LIKE '4%' THEN 'ASPHALT'
    WHEN wvdoh_item_code LIKE '5%' THEN 'CONCRETE'
    WHEN wvdoh_item_code LIKE '6%' THEN 'STRUCTURES'
    WHEN wvdoh_item_code LIKE '7%' THEN 'STRUCTURES'
    WHEN wvdoh_item_code LIKE '8%' THEN 'INCIDENTALS'
    ELSE 'OTHER'
END
WHERE proposal_id = 'target-proposal-id';
```

---

## PART 3: UI/UX ENHANCEMENTS

### 3.1 Interactive Risk Heat Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RISK HEAT MAP                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│              Low Impact    Medium Impact    High Impact                     │
│            ┌────────────┬────────────────┬────────────────┐                │
│   High     │            │  Steel         │  Contract Days │                │
│   Prob     │            │  Condition     │  ⚠️ CRITICAL   │                │
│            ├────────────┼────────────────┼────────────────┤                │
│   Medium   │            │  Lead Paint    │  Plans         │                │
│   Prob     │            │  Phasing       │  Unreadable    │                │
│            ├────────────┼────────────────┼────────────────┤                │
│   Low      │  River     │                │                │                │
│   Prob     │  Access    │                │                │                │
│            └────────────┴────────────────┴────────────────┘                │
│                                                                             │
│  Click any cell to see detailed risk information and mitigation actions    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Executive Summary Cards

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   GO/NO-GO       │  │   AI CONFIDENCE  │  │   WIN PROB       │
│                  │  │                  │  │                  │
│   🟢 PURSUE      │  │      72%         │  │      45%         │
│                  │  │    MEDIUM        │  │   at $3.35M      │
│   Mitigate risks │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   PEAK CASH      │  │   MARGIN @       │  │   DATA COMPLETE  │
│                  │  │   BALANCED       │  │                  │
│    $731,400      │  │      12%         │  │      67%         │
│    Month 2       │  │   $402,000       │  │   3 gaps found   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### 3.3 Document Health Indicator

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DOCUMENT ANALYSIS STATUS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ✅ EBSX/BIDX File          Extracted 55 line items successfully           │
│  ✅ Environmental Document  Lead paint confirmed, asbestos negative         │
│  ✅ Asbestos Report         All 9 samples negative                         │
│  ✅ Proposal Document       Project info extracted                         │
│  ⚠️ Existing Plans          FAILED — 26.1MB file not readable              │
│                                                                             │
│  Overall Document Health: 80% (4 of 5 documents processed)                 │
│                                                                             │
│  ⚠️ ACTION REQUIRED: Obtain readable copy of existing plans                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 4: API ENDPOINTS

### 4.1 New Endpoints Required

```typescript
// Executive Handoff V2 API Routes

// Generate complete analysis
POST /api/v1/bids/{proposal_id}/generate-handoff
Request: { 
  include_historical: boolean,
  include_competitive: boolean,
  include_cash_flow: boolean,
  pricing_scenarios: ['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE']
}
Response: { 
  handoff_id: UUID,
  status: 'GENERATING' | 'COMPLETE' | 'FAILED',
  estimated_completion: ISO8601
}

// Get confidence scores
GET /api/v1/bids/{proposal_id}/confidence
Response: {
  overall: { score: 0.72, level: 'MEDIUM' },
  components: { ... },
  data_completeness: { ... },
  limiting_factors: string[]
}

// Get historical comparisons
GET /api/v1/bids/{proposal_id}/historical-comparisons
Response: {
  similar_projects: ProjectComparison[],
  unit_price_benchmarks: UnitPriceBenchmark[]
}

// Get bid strategy recommendations
GET /api/v1/bids/{proposal_id}/strategy
Response: {
  scenarios: PricingScenario[],
  recommended: 'BALANCED',
  unbalancing_opportunities: UnbalancingOpp[],
  competitive_analysis: CompetitiveAnalysis
}

// Generate pre-bid questions
POST /api/v1/bids/{proposal_id}/generate-questions
Response: {
  questions: PreBidQuestion[],
  export_url: string  // Excel download
}

// Get cash flow projection
GET /api/v1/bids/{proposal_id}/cash-flow
Request: { 
  assumed_duration_days?: number,
  mobilization_front_load_pct?: number
}
Response: {
  assumptions: CashFlowAssumptions,
  monthly_projections: MonthlyProjection[],
  key_metrics: CashFlowMetrics,
  warnings: string[]
}
```

---

## PART 5: IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1-2)
- [ ] Create new database tables (confidence, historical, competitive)
- [ ] Fix existing bugs (risk count, work package values, categorization)
- [ ] Implement AI confidence scoring pipeline
- [ ] Add data completeness tracking

### Phase 2: Intelligence (Week 3-4)
- [ ] Build historical comparison engine
- [ ] Implement unit price benchmarking
- [ ] Create competitive intelligence module
- [ ] Add weather window analysis

### Phase 3: Strategy (Week 5-6)
- [ ] Build bid strategy engine with pricing scenarios
- [ ] Implement cash flow projection
- [ ] Create self-perform vs subcontract analysis
- [ ] Enhance pre-bid question generator

### Phase 4: UX (Week 7-8)
- [ ] Implement interactive risk heat map
- [ ] Add executive summary cards
- [ ] Create document health indicator
- [ ] Build PDF export enhancements

---

## PART 6: SUCCESS CRITERIA

### Quantitative Metrics
| Metric | V1 Baseline | V2 Target |
|--------|-------------|-----------|
| AI Recommendations with Confidence Score | 0% | 100% |
| Historical Comparisons per Bid | 0 | 3-5 |
| Auto-Generated Pre-Bid Questions | 0 | 5-10 |
| Value Engineering Ideas | 0 | 3-5 |
| Pricing Scenarios Generated | 1 | 3 |
| Data Completeness Visibility | None | Full Dashboard |

### Qualitative Outcomes
- Estimators trust AI recommendations more (confidence transparency)
- Management can make GO/NO-GO decisions faster
- Pre-bid questions are submitted earlier (auto-generation)
- Bid strategy discussions are data-driven (scenarios)
- Post-bid analysis improved (historical tracking)

---

## PART 7: DEPENDENCIES

### External Data Required
1. **Historical Project Database** — Past bid outcomes with actuals
2. **Competitor Intelligence** — WVDOH public bid results
3. **Weather Data API** — NOAA historical for WV counties
4. **Material Price Index** — Steel, concrete, asphalt trends

### Integration Points
- `AI_BID_INTELLIGENCE_STRATEGY_V3.md` — Existing schema
- `UNIFIED_PAY_ESTIMATE_SPEC_V7.md` — Post-win integration
- `BID_TO_EXECUTION_INTEGRATION.md` — Handoff workflow

---

## APPENDIX A: Sample AI Prompts

### Confidence Score Generation
```
Analyze this WVDOH bid package and rate your confidence (0-100%) for each:
1. Document extraction completeness
2. Risk identification accuracy  
3. Cost estimate reliability
4. Work package categorization
5. Schedule analysis quality

For each rating, explain:
- What data supports this confidence level
- What missing data would improve confidence
- Any assumptions made due to data gaps
```

### Pre-Bid Question Generation
```
Review all identified risks and data gaps. Generate pre-bid questions that:
1. Address the highest-impact unknowns
2. Reference specific spec sections or line items
3. Can be answered with factual information (not opinions)
4. Would materially affect bid pricing if answered differently

Format each question with:
- Priority (CRITICAL/HIGH/MEDIUM/LOW)
- The question text
- Spec or document reference
- Risk if left unresolved
- Suggested submission deadline
```

### Value Engineering Identification
```
Analyze the bid items and identify value engineering opportunities:
1. Alternative materials or methods
2. Specification relaxations that could be requested
3. Quantity optimization potential
4. Schedule efficiencies

For each opportunity provide:
- Potential savings range (low-high)
- Feasibility rating
- Risk level
- Whether WVDOH approval is required
- Specific action to pursue
```

---

*End of Handoff Document*

**Next Step:** Review with Jason Lusk and prioritize Phase 1 deliverables for Triplett Bridge POC.
