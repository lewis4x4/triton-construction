/**
 * Mock Bid Data for WVDOH Triplett Project
 * Route 33 Corridor H - Section 12, Elkins to Buckhannon
 *
 * This data simulates a real WVDOH highway construction bid package
 * for demonstration and development purposes.
 */

// ============================================
// PROJECT METADATA
// ============================================

export interface BidProject {
  id: string;
  projectNumber: string;
  contractId: string;
  name: string;
  description: string;
  owner: string;
  ownerType: 'WVDOH' | 'COUNTY' | 'MUNICIPAL' | 'FEDERAL' | 'PRIVATE';
  district: number;
  county: string;
  route: string;
  beginMilepost: number;
  endMilepost: number;
  bidDate: string;
  bidTime: string;
  estimatedValue: number;
  engineersEstimate?: number;
  dbeGoal: number;
  preBidDate?: string;
  preBidLocation?: string;
  questionDeadline: string;
  bondRequirements: {
    bidBond: number;
    performanceBond: number;
    paymentBond: number;
  };
  keyDates: {
    noticeToProceed: string;
    substantialCompletion: string;
    finalCompletion: string;
  };
  workingDays: number;
  liquidatedDamages: number;
  federalAid: boolean;
  davisBaconRequired: boolean;
  buyAmericaRequired: boolean;
  status: 'PLANNING' | 'ADVERTISED' | 'BID_OPENING' | 'EVALUATION' | 'AWARDED' | 'ACTIVE';
}

export const mockProject: BidProject = {
  id: 'proj-triplett-2024',
  projectNumber: 'S331-33-12.00',
  contractId: 'DOH-2024-C-0847',
  name: 'Corridor H - Section 12: Triplett Interchange to Buckhannon',
  description: 'Construction of 4-lane divided highway including earthwork, drainage structures, bridge construction, asphalt paving, and all incidentals. Project includes construction of new interchange at Triplett and extension of Corridor H from Elkins toward Buckhannon.',
  owner: 'West Virginia Division of Highways',
  ownerType: 'WVDOH',
  district: 8,
  county: 'Upshur',
  route: 'US Route 33 (Corridor H)',
  beginMilepost: 12.00,
  endMilepost: 18.75,
  bidDate: '2025-01-15',
  bidTime: '10:00 AM EST',
  estimatedValue: 47500000,
  engineersEstimate: 45200000,
  dbeGoal: 8.5,
  preBidDate: '2024-12-18',
  preBidLocation: 'WVDOH District 8 Conference Room, Elkins, WV',
  questionDeadline: '2025-01-08',
  bondRequirements: {
    bidBond: 5,
    performanceBond: 100,
    paymentBond: 100,
  },
  keyDates: {
    noticeToProceed: '2025-03-01',
    substantialCompletion: '2027-10-31',
    finalCompletion: '2027-12-15',
  },
  workingDays: 540,
  liquidatedDamages: 3500,
  federalAid: true,
  davisBaconRequired: true,
  buyAmericaRequired: true,
  status: 'ADVERTISED',
};

// ============================================
// BID ITEMS
// ============================================

export interface BidItem {
  id: string;
  itemNumber: string;
  specSection: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice?: number;
  extension?: number;
  category: string;
  notes?: string;
  subcontractable: boolean;
  dbeOpportunity: boolean;
}

export const mockBidItems: BidItem[] = [
  // EARTHWORK
  {
    id: 'item-001',
    itemNumber: '203.1',
    specSection: '203',
    description: 'Unclassified Excavation',
    unit: 'CY',
    quantity: 485000,
    unitPrice: 8.50,
    category: 'Earthwork',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-002',
    itemNumber: '203.2',
    specSection: '203',
    description: 'Rock Excavation',
    unit: 'CY',
    quantity: 125000,
    unitPrice: 28.00,
    category: 'Earthwork',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-003',
    itemNumber: '203.3',
    specSection: '203',
    description: 'Borrow Excavation',
    unit: 'CY',
    quantity: 320000,
    unitPrice: 12.75,
    category: 'Earthwork',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-004',
    itemNumber: '207.1',
    specSection: '207',
    description: 'Embankment in Place',
    unit: 'CY',
    quantity: 680000,
    unitPrice: 6.25,
    category: 'Earthwork',
    subcontractable: true,
    dbeOpportunity: true,
  },

  // DRAINAGE
  {
    id: 'item-005',
    itemNumber: '601.1',
    specSection: '601',
    description: '18" Reinforced Concrete Pipe',
    unit: 'LF',
    quantity: 4200,
    unitPrice: 85.00,
    category: 'Drainage',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-006',
    itemNumber: '601.2',
    specSection: '601',
    description: '24" Reinforced Concrete Pipe',
    unit: 'LF',
    quantity: 3800,
    unitPrice: 115.00,
    category: 'Drainage',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-007',
    itemNumber: '601.3',
    specSection: '601',
    description: '36" Reinforced Concrete Pipe',
    unit: 'LF',
    quantity: 2400,
    unitPrice: 185.00,
    category: 'Drainage',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-008',
    itemNumber: '601.4',
    specSection: '601',
    description: '48" Reinforced Concrete Pipe',
    unit: 'LF',
    quantity: 1800,
    unitPrice: 295.00,
    category: 'Drainage',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-009',
    itemNumber: '602.1',
    specSection: '602',
    description: 'Type C Inlet',
    unit: 'EA',
    quantity: 156,
    unitPrice: 3200.00,
    category: 'Drainage',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-010',
    itemNumber: '602.2',
    specSection: '602',
    description: 'Type D Inlet',
    unit: 'EA',
    quantity: 84,
    unitPrice: 4500.00,
    category: 'Drainage',
    subcontractable: true,
    dbeOpportunity: true,
  },

  // STRUCTURES
  {
    id: 'item-011',
    itemNumber: '502.1',
    specSection: '502',
    description: 'Class B Concrete (Substructure)',
    unit: 'CY',
    quantity: 4200,
    unitPrice: 850.00,
    category: 'Structures',
    subcontractable: true,
    dbeOpportunity: false,
  },
  {
    id: 'item-012',
    itemNumber: '502.2',
    specSection: '502',
    description: 'Class A Concrete (Superstructure)',
    unit: 'CY',
    quantity: 3600,
    unitPrice: 950.00,
    category: 'Structures',
    subcontractable: true,
    dbeOpportunity: false,
  },
  {
    id: 'item-013',
    itemNumber: '504.1',
    specSection: '504',
    description: 'Reinforcing Steel, Epoxy Coated',
    unit: 'LB',
    quantity: 1850000,
    unitPrice: 1.25,
    category: 'Structures',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-014',
    itemNumber: '505.1',
    specSection: '505',
    description: 'Prestressed Concrete Beams, Type IV',
    unit: 'LF',
    quantity: 2400,
    unitPrice: 425.00,
    category: 'Structures',
    subcontractable: false,
    dbeOpportunity: false,
  },

  // PAVING
  {
    id: 'item-015',
    itemNumber: '401.1',
    specSection: '401',
    description: 'Aggregate Base Course, 6" Depth',
    unit: 'SY',
    quantity: 285000,
    unitPrice: 8.50,
    category: 'Paving',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-016',
    itemNumber: '411.1',
    specSection: '411',
    description: 'Superpave Hot Mix Asphalt, Base Course, 19mm',
    unit: 'TON',
    quantity: 95000,
    unitPrice: 92.00,
    category: 'Paving',
    subcontractable: true,
    dbeOpportunity: false,
  },
  {
    id: 'item-017',
    itemNumber: '411.2',
    specSection: '411',
    description: 'Superpave Hot Mix Asphalt, Intermediate Course, 12.5mm',
    unit: 'TON',
    quantity: 65000,
    unitPrice: 98.00,
    category: 'Paving',
    subcontractable: true,
    dbeOpportunity: false,
  },
  {
    id: 'item-018',
    itemNumber: '411.3',
    specSection: '411',
    description: 'Superpave Hot Mix Asphalt, Surface Course, 9.5mm',
    unit: 'TON',
    quantity: 42000,
    unitPrice: 105.00,
    category: 'Paving',
    subcontractable: true,
    dbeOpportunity: false,
  },
  {
    id: 'item-019',
    itemNumber: '412.1',
    specSection: '412',
    description: 'Tack Coat',
    unit: 'GAL',
    quantity: 125000,
    unitPrice: 3.25,
    category: 'Paving',
    subcontractable: true,
    dbeOpportunity: true,
  },

  // TRAFFIC
  {
    id: 'item-020',
    itemNumber: '636.1',
    specSection: '636',
    description: '4" White Thermoplastic Pavement Marking',
    unit: 'LF',
    quantity: 145000,
    unitPrice: 1.85,
    category: 'Traffic',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-021',
    itemNumber: '636.2',
    specSection: '636',
    description: '4" Yellow Thermoplastic Pavement Marking',
    unit: 'LF',
    quantity: 72500,
    unitPrice: 1.95,
    category: 'Traffic',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-022',
    itemNumber: '606.1',
    specSection: '606',
    description: 'Steel Beam Guardrail, Type A',
    unit: 'LF',
    quantity: 28500,
    unitPrice: 32.00,
    category: 'Traffic',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-023',
    itemNumber: '614.1',
    specSection: '614',
    description: 'Highway Signs, Type A',
    unit: 'SF',
    quantity: 2400,
    unitPrice: 45.00,
    category: 'Traffic',
    subcontractable: true,
    dbeOpportunity: true,
  },

  // EROSION CONTROL
  {
    id: 'item-024',
    itemNumber: '653.1',
    specSection: '653',
    description: 'Seeding, Class A',
    unit: 'AC',
    quantity: 185,
    unitPrice: 2800.00,
    category: 'Erosion Control',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-025',
    itemNumber: '653.2',
    specSection: '653',
    description: 'Mulching',
    unit: 'AC',
    quantity: 185,
    unitPrice: 1200.00,
    category: 'Erosion Control',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-026',
    itemNumber: '654.1',
    specSection: '654',
    description: 'Silt Fence',
    unit: 'LF',
    quantity: 42000,
    unitPrice: 4.50,
    category: 'Erosion Control',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-027',
    itemNumber: '656.1',
    specSection: '656',
    description: 'Erosion Control Blanket',
    unit: 'SY',
    quantity: 68000,
    unitPrice: 3.75,
    category: 'Erosion Control',
    subcontractable: true,
    dbeOpportunity: true,
  },

  // UTILITIES
  {
    id: 'item-028',
    itemNumber: '701.1',
    specSection: '701',
    description: 'Temporary Water Service',
    unit: 'LS',
    quantity: 1,
    unitPrice: 45000.00,
    category: 'Utilities',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-029',
    itemNumber: '702.1',
    specSection: '702',
    description: 'Utility Relocation Coordination',
    unit: 'LS',
    quantity: 1,
    unitPrice: 125000.00,
    category: 'Utilities',
    notes: 'Coordinate with Dominion Energy, Frontier, Mountaineer Gas',
    subcontractable: false,
    dbeOpportunity: false,
  },

  // MISCELLANEOUS
  {
    id: 'item-030',
    itemNumber: '109.1',
    specSection: '109',
    description: 'Mobilization',
    unit: 'LS',
    quantity: 1,
    unitPrice: 2100000.00,
    category: 'General',
    subcontractable: false,
    dbeOpportunity: false,
  },
  {
    id: 'item-031',
    itemNumber: '110.1',
    specSection: '110',
    description: 'Traffic Control',
    unit: 'LS',
    quantity: 1,
    unitPrice: 850000.00,
    category: 'General',
    subcontractable: true,
    dbeOpportunity: true,
  },
  {
    id: 'item-032',
    itemNumber: '619.1',
    specSection: '619',
    description: 'Construction Staking',
    unit: 'LS',
    quantity: 1,
    unitPrice: 425000.00,
    category: 'General',
    subcontractable: true,
    dbeOpportunity: true,
  },
];

// Calculate extensions
mockBidItems.forEach((item) => {
  if (item.unitPrice) {
    item.extension = item.quantity * item.unitPrice;
  }
});

// ============================================
// SPEC SECTIONS (for semantic search)
// ============================================

export interface SpecSection {
  id: string;
  sectionNumber: string;
  title: string;
  content: string;
  subsections: string[];
  keywords: string[];
  relatedItems: string[];
}

export const mockSpecSections: SpecSection[] = [
  {
    id: 'spec-203',
    sectionNumber: '203',
    title: 'Excavation and Embankment',
    content: `This work consists of excavating, hauling, and disposing of all materials encountered within the limits of the project, including rock excavation, and constructing embankments from approved materials.

MATERIALS: Embankment material shall be free from frozen material, stumps, roots, sod, and other perishable matter. Rock fragments shall not exceed 6 inches in greatest dimension in the top 12 inches of embankment.

CONSTRUCTION METHODS:
1. Excavation shall be performed in a manner to prevent damage to existing utilities and structures.
2. Rock excavation requires pre-blast surveys within 500 feet of structures.
3. Embankment shall be placed in horizontal layers not exceeding 8 inches loose depth.
4. Each layer shall be compacted to 95% of maximum dry density per AASHTO T-180.

MEASUREMENT: Excavation quantities will be computed by the average end area method from original ground cross-sections and final excavation cross-sections.

PAYMENT: Unclassified excavation, rock excavation, and borrow will be paid per cubic yard at the contract unit price.`,
    subsections: ['203.1 Unclassified Excavation', '203.2 Rock Excavation', '203.3 Borrow'],
    keywords: ['excavation', 'embankment', 'rock', 'borrow', 'compaction', 'earthwork', 'fill', 'cut', 'grading'],
    relatedItems: ['203.1', '203.2', '203.3', '207.1'],
  },
  {
    id: 'spec-401',
    sectionNumber: '401',
    title: 'Aggregate Base Course',
    content: `This work consists of constructing one or more courses of aggregate base on a prepared subgrade.

MATERIALS: Aggregate base shall conform to WVDOH Section 703.03 gradation requirements. Material shall be crushed stone or crushed gravel with at least 50% fractured faces.

AGGREGATE REQUIREMENTS:
- LA Abrasion: Maximum 45%
- Liquid Limit: Maximum 25
- Plasticity Index: Maximum 6
- Gradation per Table 703.03-1

CONSTRUCTION:
1. Subgrade shall be proof-rolled prior to base placement.
2. Base material shall be spread in uniform layers not exceeding 6 inches compacted depth.
3. Moisture content shall be within 2% of optimum.
4. Compaction shall achieve minimum 98% of AASHTO T-180 density.

WEATHER LIMITATIONS: Do not place aggregate base when temperature is below 35°F or when subgrade is frozen.

TOLERANCES: Finished surface shall not vary more than 3/8 inch from a 10-foot straightedge.`,
    subsections: ['401.1 Aggregate Base Course', '401.2 Proof Rolling'],
    keywords: ['aggregate', 'base course', 'crushed stone', 'subgrade', 'compaction', 'gradation', 'ABC'],
    relatedItems: ['401.1'],
  },
  {
    id: 'spec-411',
    sectionNumber: '411',
    title: 'Superpave Hot Mix Asphalt',
    content: `This work consists of constructing one or more courses of Superpave hot mix asphalt (HMA) pavement on a prepared base.

MIX DESIGN REQUIREMENTS:
- Performance Grade: PG 64-22 (base), PG 76-22 (surface in high traffic areas)
- Air Voids: 4.0% at Ndesign
- VMA: Per mix type table
- Dust-to-Binder Ratio: 0.6 to 1.2

AGGREGATE REQUIREMENTS:
- Coarse Aggregate Angularity: 95% minimum (2 fractured faces)
- Fine Aggregate Angularity: 45 minimum
- Sand Equivalent: 45 minimum
- Flat/Elongated: 10% maximum at 5:1 ratio

PLANT REQUIREMENTS: HMA shall be produced at an approved Superpave plant with current WVDOH certification.

PLACEMENT TEMPERATURE: Minimum 280°F behind the screed for PG 64-22. Minimum 300°F for PG 76-22 modified binder.

COMPACTION: Achieve 92-96% of theoretical maximum density. Rolling pattern shall be established with test strip. Breakdown rolling shall begin immediately behind the paver.

JOINTS: Longitudinal joints shall be offset minimum 6 inches between layers. Transverse joints shall use paper joint or notched wedge technique.`,
    subsections: ['411.1 Base Course', '411.2 Intermediate Course', '411.3 Surface Course', '411.4 Leveling Course'],
    keywords: ['asphalt', 'HMA', 'Superpave', 'paving', 'compaction', 'mix design', 'temperature', 'rolling', 'binder'],
    relatedItems: ['411.1', '411.2', '411.3'],
  },
  {
    id: 'spec-502',
    sectionNumber: '502',
    title: 'Structural Concrete',
    content: `This work consists of furnishing and placing structural concrete for bridges, culverts, retaining walls, and other structures.

CONCRETE CLASSES:
- Class A: f'c = 4,000 psi (superstructure, deck)
- Class B: f'c = 3,500 psi (substructure, footings)
- Class C: f'c = 3,000 psi (mass concrete)
- HPC: f'c = 6,000 psi (high performance applications)

MIX REQUIREMENTS:
- Maximum water/cementitious ratio: 0.45 (Class A), 0.50 (Class B)
- Air content: 6% ± 1.5% for exposed concrete
- Slump: 4 inches maximum (8 inches with HRWR)

PLACEMENT:
1. Concrete shall be placed within 90 minutes of batching.
2. Free fall shall not exceed 5 feet.
3. Vibration shall achieve full consolidation without segregation.
4. Placement rate shall prevent cold joints.

CURING: Apply curing compound immediately after finishing or use wet burlap/polyethylene for 7 days minimum. High performance concrete requires 14-day wet cure.

COLD WEATHER: Concrete temperature shall be minimum 50°F at placement. Protect from freezing for 72 hours minimum.`,
    subsections: ['502.1 Class B Concrete', '502.2 Class A Concrete', '502.3 HPC'],
    keywords: ['concrete', 'structural', 'bridge', 'deck', 'substructure', 'curing', 'placement', 'mix design', 'formwork'],
    relatedItems: ['502.1', '502.2'],
  },
  {
    id: 'spec-504',
    sectionNumber: '504',
    title: 'Reinforcing Steel',
    content: `This work consists of furnishing and placing reinforcing steel bars and welded wire reinforcement.

MATERIALS:
- Reinforcing bars: ASTM A615 Grade 60
- Epoxy coating: ASTM A775 or A934
- Stainless steel: ASTM A955 Grade 60 (where specified)
- Welded wire: ASTM A185 or A497

EPOXY COATING REQUIREMENTS:
- Minimum thickness: 7 mils
- Holiday testing per ASTM D5162
- Repair all damage with patching compound
- Use epoxy-coated tie wire in coated bar zones

BAR PLACEMENT:
- Tie at every intersection in walls and columns
- Tie at alternating intersections in slabs
- Minimum cover per plans (typically 2" for deck, 3" for substructure)
- Support bars on chairs/bolsters at 4-foot spacing

SPLICES:
- Lap splices per ACI 318 development length tables
- Mechanical splices: Type 1 or Type 2 per plans
- No welding without approved procedure

TOLERANCES:
- Cover: +1/4", -1/4"
- Spacing: ±1"
- Location of bar ends: ±2"`,
    subsections: ['504.1 Reinforcing Steel', '504.2 Epoxy Coated Bars', '504.3 Stainless Steel'],
    keywords: ['rebar', 'reinforcing', 'steel', 'epoxy', 'splice', 'cover', 'tie wire', 'placement'],
    relatedItems: ['504.1'],
  },
  {
    id: 'spec-601',
    sectionNumber: '601',
    title: 'Pipe Culverts',
    content: `This work consists of furnishing and installing pipe culverts and storm drains.

PIPE MATERIALS:
- Reinforced concrete pipe (RCP): ASTM C76, Class III, IV, or V
- Corrugated metal pipe (CMP): AASHTO M36
- HDPE: AASHTO M294, Type S
- PVC: ASTM F679 or D3034

BEDDING:
- Class B bedding standard for RCP
- Granular bedding material: 1" maximum size
- Bedding depth: 4" minimum below pipe
- Haunching required to springline

INSTALLATION:
1. Trench width: OD + 24" minimum
2. Pipe shall be laid upgrade with bell or groove upstream
3. Joints: Use rubber gaskets for RCP, coupling bands for CMP
4. Backfill in 6-inch lifts with hand tamping in haunch zone

TESTING:
- Mandrel testing for flexible pipe (92.5% of ID)
- Television inspection for pipes 24" and larger
- Air or water testing per WVDOH standards

MINIMUM COVER:
- RCP: 12 inches
- CMP: 24 inches
- HDPE: Per manufacturer but not less than 12 inches`,
    subsections: ['601.1 RCP', '601.2 CMP', '601.3 HDPE', '601.4 PVC'],
    keywords: ['pipe', 'culvert', 'drainage', 'storm drain', 'RCP', 'bedding', 'backfill', 'trench'],
    relatedItems: ['601.1', '601.2', '601.3', '601.4'],
  },
  {
    id: 'spec-606',
    sectionNumber: '606',
    title: 'Guardrail',
    content: `This work consists of furnishing and installing steel beam guardrail and associated hardware.

MATERIALS:
- W-beam rail: AASHTO M180, Class A, Type II
- Posts: Steel W6x8.5 or wood 6"x8"
- Blocks: Steel or recycled plastic
- Hardware: Galvanized per ASTM A153

GUARDRAIL TYPES:
- Type A: Standard roadside guardrail
- Type B: Median barrier
- Type T: Transition to bridge rail

POST INSTALLATION:
- Steel posts: Drive to refusal or minimum 44" embedment
- Wood posts: 42" minimum embedment
- Post spacing: 6'-3" standard, 3'-1.5" at terminals
- Verify soil conditions - may require longer posts

RAIL INSTALLATION:
- Rail joints shall be lapped in direction of traffic
- Use splice bolts at each joint
- Maintain 27.75" mounting height (top of rail to ground)
- Terminal ends: Use approved end treatments (SKT, FLEAT, etc.)

CRASH TESTING: All guardrail systems shall be MASH (Manual for Assessing Safety Hardware) compliant at applicable test levels.`,
    subsections: ['606.1 Type A Guardrail', '606.2 Type B Guardrail', '606.3 Terminals'],
    keywords: ['guardrail', 'barrier', 'W-beam', 'posts', 'safety', 'terminal', 'MASH', 'traffic'],
    relatedItems: ['606.1'],
  },
  {
    id: 'spec-636',
    sectionNumber: '636',
    title: 'Pavement Markings',
    content: `This work consists of applying pavement markings including paint, thermoplastic, and preformed tape.

MARKING TYPES:
- Type A: Water-based traffic paint
- Type B: Thermoplastic
- Type C: Preformed thermoplastic tape
- Type D: Epoxy

THERMOPLASTIC REQUIREMENTS:
- Thickness: 90 mils (standard), 125 mils (intersection)
- Glass beads: 25 lbs/100 SF minimum, reflective grade
- Application temperature: 400-425°F
- Surface preparation: Clean, dry, minimum 50°F

COLOR REQUIREMENTS:
- White: Edge lines, lane lines, crosswalks
- Yellow: Center lines, no passing zones, turn lanes
- Retroreflectivity: 250 mcd/m²/lux minimum initial

LAYOUT:
- Broken lines: 10' stripe, 30' gap (rural), 3' stripe, 9' gap (urban)
- Edge lines: 4" continuous
- Center lines: 4" double yellow in no-passing zones
- Lane lines: 4" broken white

APPLICATION:
1. Surface must be clean and dry
2. Minimum pavement age: 14 days (new HMA)
3. Apply during daylight hours
4. Protect markings until dry/cooled

WARRANTY: Thermoplastic markings shall maintain minimum retroreflectivity for 3 years.`,
    subsections: ['636.1 Thermoplastic', '636.2 Paint', '636.3 Preformed Tape', '636.4 Removal'],
    keywords: ['pavement marking', 'striping', 'thermoplastic', 'paint', 'lane line', 'edge line', 'reflectivity'],
    relatedItems: ['636.1', '636.2'],
  },
  {
    id: 'spec-653',
    sectionNumber: '653',
    title: 'Seeding and Mulching',
    content: `This work consists of preparing seedbed, seeding, fertilizing, and mulching all areas disturbed by construction.

SEED MIXTURES:
Class A (Slopes 3:1 or flatter):
- Kentucky Bluegrass: 20%
- Tall Fescue: 40%
- Perennial Ryegrass: 30%
- White Clover: 10%
Rate: 150 lbs/acre

Class B (Slopes steeper than 3:1):
- Tall Fescue: 50%
- Perennial Ryegrass: 30%
- Crownvetch: 20%
Rate: 175 lbs/acre

FERTILIZER:
- Analysis: 10-20-10
- Rate: 400 lbs/acre
- Apply before seeding and lightly incorporate

MULCH:
- Straw: 2 tons/acre, anchored with tackifier or crimping
- Hydraulic mulch: Wood fiber at 2,000 lbs/acre with tackifier
- Erosion control blanket per Section 656

SEASONAL LIMITATIONS:
- Primary seeding: March 1 - May 31, August 15 - October 15
- Emergency seeding: Apply temporary cover any time for erosion control
- Dormant seeding: November 15 - February 28 (no mulch anchoring)

ESTABLISHMENT PERIOD: Contractor responsible for establishment until 70% cover achieved over 90% of seeded area.`,
    subsections: ['653.1 Seeding', '653.2 Mulching', '653.3 Sodding'],
    keywords: ['seeding', 'mulching', 'erosion control', 'grass', 'fertilizer', 'establishment', 'revegetation'],
    relatedItems: ['653.1', '653.2'],
  },
];

// ============================================
// ADDENDA
// ============================================

export interface Addendum {
  id: string;
  number: number;
  issueDate: string;
  description: string;
  changes: AddendumChange[];
}

export interface AddendumChange {
  id: string;
  changeType: 'QUANTITY' | 'SPECIFICATION' | 'PLAN_REVISION' | 'NEW_ITEM' | 'DELETE_ITEM' | 'CLARIFICATION' | 'DATE_CHANGE';
  itemNumber?: string;
  section?: string;
  originalText?: string;
  revisedText: string;
  quantityChange?: {
    original: number;
    revised: number;
    difference: number;
    percentChange: number;
  };
  costImpact?: 'INCREASE' | 'DECREASE' | 'NEUTRAL' | 'TBD';
  impactEstimate?: number;
}

export const mockAddenda: Addendum[] = [
  {
    id: 'add-001',
    number: 1,
    issueDate: '2024-12-05',
    description: 'Quantity adjustments based on updated survey and revised drainage design',
    changes: [
      {
        id: 'chg-001-1',
        changeType: 'QUANTITY',
        itemNumber: '203.1',
        originalText: 'Unclassified Excavation: 485,000 CY',
        revisedText: 'Unclassified Excavation: 512,000 CY',
        quantityChange: {
          original: 485000,
          revised: 512000,
          difference: 27000,
          percentChange: 5.57,
        },
        costImpact: 'INCREASE',
        impactEstimate: 229500,
      },
      {
        id: 'chg-001-2',
        changeType: 'QUANTITY',
        itemNumber: '601.3',
        originalText: '36" RCP: 2,400 LF',
        revisedText: '36" RCP: 2,850 LF',
        quantityChange: {
          original: 2400,
          revised: 2850,
          difference: 450,
          percentChange: 18.75,
        },
        costImpact: 'INCREASE',
        impactEstimate: 83250,
      },
      {
        id: 'chg-001-3',
        changeType: 'PLAN_REVISION',
        section: 'Sheet D-15',
        revisedText: 'Revised drainage profile at STA 245+00 to accommodate utility conflict. See revised Sheet D-15R.',
        costImpact: 'NEUTRAL',
      },
    ],
  },
  {
    id: 'add-002',
    number: 2,
    issueDate: '2024-12-12',
    description: 'Specification clarifications and pre-bid meeting responses',
    changes: [
      {
        id: 'chg-002-1',
        changeType: 'SPECIFICATION',
        section: '411',
        originalText: 'Performance Grade: PG 64-22 (base)',
        revisedText: 'Performance Grade: PG 64-22 (base courses), PG 70-22 (surface course in mainline travel lanes)',
        costImpact: 'INCREASE',
        impactEstimate: 126000,
      },
      {
        id: 'chg-002-2',
        changeType: 'CLARIFICATION',
        section: 'General',
        revisedText: 'Q: Is blasting permitted within 500 feet of the existing US-33 alignment?\nA: Controlled blasting is permitted with an approved blasting plan. Pre-blast survey required for all structures within 1,000 feet. Traffic control required during blast events.',
        costImpact: 'NEUTRAL',
      },
      {
        id: 'chg-002-3',
        changeType: 'CLARIFICATION',
        section: 'General',
        revisedText: 'Q: What is the source for borrow material?\nA: Contractor may use any approved source. WVDOH-approved borrow sites within 15 miles include: Talbott Quarry (MP 8.2), Mountain State Aggregates (MP 22.1). Material testing required prior to use.',
        costImpact: 'NEUTRAL',
      },
      {
        id: 'chg-002-4',
        changeType: 'DATE_CHANGE',
        section: 'Bid Schedule',
        originalText: 'Bid Opening: January 15, 2025 at 10:00 AM',
        revisedText: 'Bid Opening: January 22, 2025 at 10:00 AM (7-day extension due to addenda)',
        costImpact: 'NEUTRAL',
      },
    ],
  },
  {
    id: 'add-003',
    number: 3,
    issueDate: '2024-12-18',
    description: 'Bridge foundation modifications and new bid item',
    changes: [
      {
        id: 'chg-003-1',
        changeType: 'NEW_ITEM',
        itemNumber: '506.1',
        revisedText: 'Add new bid item 506.1 - Drilled Shaft Foundations, 48" Diameter: 8 EA. Geotechnical investigation indicates rock at Bridge No. 3 location is fractured and unsuitable for spread footings. Drilled shafts required to competent rock.',
        costImpact: 'INCREASE',
        impactEstimate: 640000,
      },
      {
        id: 'chg-003-2',
        changeType: 'QUANTITY',
        itemNumber: '502.1',
        originalText: 'Class B Concrete (Substructure): 4,200 CY',
        revisedText: 'Class B Concrete (Substructure): 3,850 CY',
        quantityChange: {
          original: 4200,
          revised: 3850,
          difference: -350,
          percentChange: -8.33,
        },
        costImpact: 'DECREASE',
        impactEstimate: -297500,
      },
      {
        id: 'chg-003-3',
        changeType: 'PLAN_REVISION',
        section: 'Sheets S-8 through S-12',
        revisedText: 'Complete revision of Bridge No. 3 foundation plans. Replace spread footings with drilled shaft foundations. See revised sheets S-8R through S-12R.',
        costImpact: 'TBD',
      },
    ],
  },
];

// ============================================
// DBE SUBCONTRACTORS
// ============================================

export interface DBESubcontractor {
  id: string;
  companyName: string;
  ownerName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  certifications: ('DBE' | 'WBE' | 'MBE' | 'SBE' | 'VOSB' | 'SDVOSB')[];
  certifyingAgency: string;
  certificationExpires: string;
  naicsCodes: string[];
  capabilities: string[];
  bondingCapacity: number;
  previousWVDOHWork: boolean;
  performanceRating?: number;
  notes?: string;
}

export const mockDBESubcontractors: DBESubcontractor[] = [
  {
    id: 'dbe-001',
    companyName: 'Mountain State Trucking LLC',
    ownerName: 'Patricia Williams',
    address: '1234 Industrial Drive',
    city: 'Bridgeport',
    state: 'WV',
    zip: '26330',
    phone: '304-555-0101',
    email: 'pwilliams@msttrucking.com',
    certifications: ['DBE', 'WBE'],
    certifyingAgency: 'WVDOH',
    certificationExpires: '2025-09-30',
    naicsCodes: ['484110', '484220'],
    capabilities: ['Dump truck hauling', 'Aggregate delivery', 'Asphalt transport'],
    bondingCapacity: 500000,
    previousWVDOHWork: true,
    performanceRating: 4.5,
    notes: 'Excellent performance on Corridor H Section 10. Fleet of 12 tri-axle dumps.',
  },
  {
    id: 'dbe-002',
    companyName: 'Appalachian Erosion Control',
    ownerName: 'James Crawford',
    address: '567 Route 20 South',
    city: 'Buckhannon',
    state: 'WV',
    zip: '26201',
    phone: '304-555-0202',
    email: 'jcrawford@appalachianec.com',
    certifications: ['DBE', 'MBE'],
    certifyingAgency: 'WVDOH',
    certificationExpires: '2025-06-15',
    naicsCodes: ['561730', '541690'],
    capabilities: ['Silt fence installation', 'Hydroseeding', 'Erosion control blankets', 'SWPPP inspections'],
    bondingCapacity: 750000,
    previousWVDOHWork: true,
    performanceRating: 4.8,
    notes: 'Specializes in mountain terrain erosion control. Certified CPESC on staff.',
  },
  {
    id: 'dbe-003',
    companyName: 'Valley Striping & Signs Inc.',
    ownerName: 'Maria Gonzalez',
    address: '890 Commerce Street',
    city: 'Weston',
    state: 'WV',
    zip: '26452',
    phone: '304-555-0303',
    email: 'mgonzalez@valleystriping.com',
    certifications: ['DBE', 'WBE', 'MBE'],
    certifyingAgency: 'WVDOH',
    certificationExpires: '2026-02-28',
    naicsCodes: ['237310', '339950'],
    capabilities: ['Thermoplastic markings', 'Highway signs', 'Delineators', 'Temporary markings'],
    bondingCapacity: 1000000,
    previousWVDOHWork: true,
    performanceRating: 4.2,
  },
  {
    id: 'dbe-004',
    companyName: 'Pioneer Concrete Pumping',
    ownerName: 'Robert Taylor',
    address: '2345 Industrial Park Road',
    city: 'Clarksburg',
    state: 'WV',
    zip: '26301',
    phone: '304-555-0404',
    email: 'rtaylor@pioneerpump.com',
    certifications: ['DBE', 'SBE'],
    certifyingAgency: 'WVDOH',
    certificationExpires: '2025-11-30',
    naicsCodes: ['238110'],
    capabilities: ['Concrete pumping', 'Boom pump services', 'Line pump services'],
    bondingCapacity: 400000,
    previousWVDOHWork: true,
    performanceRating: 4.0,
  },
  {
    id: 'dbe-005',
    companyName: 'Blue Ridge Guardrail LLC',
    ownerName: 'Thomas Anderson',
    address: '456 Safety Lane',
    city: 'Elkins',
    state: 'WV',
    zip: '26241',
    phone: '304-555-0505',
    email: 'tanderson@blueridgeguardrail.com',
    certifications: ['DBE'],
    certifyingAgency: 'WVDOH',
    certificationExpires: '2025-08-15',
    naicsCodes: ['237310'],
    capabilities: ['W-beam guardrail', 'Cable barrier', 'End treatments', 'Guardrail repair'],
    bondingCapacity: 1500000,
    previousWVDOHWork: true,
    performanceRating: 4.6,
    notes: 'MASH-certified installation crews. Quick response for emergency repairs.',
  },
  {
    id: 'dbe-006',
    companyName: 'Kanawha Fencing & Barriers',
    ownerName: 'Sandra Mitchell',
    address: '789 Protection Drive',
    city: 'Charleston',
    state: 'WV',
    zip: '25301',
    phone: '304-555-0606',
    email: 'smitchell@kanawhabfencing.com',
    certifications: ['DBE', 'WBE'],
    certifyingAgency: 'WVDOH',
    certificationExpires: '2026-01-31',
    naicsCodes: ['238990'],
    capabilities: ['Chain link fence', 'Right-of-way fence', 'Temporary barriers', 'Wildlife fence'],
    bondingCapacity: 600000,
    previousWVDOHWork: false,
  },
  {
    id: 'dbe-007',
    companyName: 'Mountaineer Traffic Control',
    ownerName: 'David Lee',
    address: '1122 Safety Boulevard',
    city: 'Fairmont',
    state: 'WV',
    zip: '26554',
    phone: '304-555-0707',
    email: 'dlee@mountaineertc.com',
    certifications: ['DBE', 'MBE', 'VOSB'],
    certifyingAgency: 'WVDOH',
    certificationExpires: '2025-12-31',
    naicsCodes: ['561990'],
    capabilities: ['Flagging services', 'Arrow boards', 'Temporary signals', 'Work zone setup'],
    bondingCapacity: 300000,
    previousWVDOHWork: true,
    performanceRating: 4.3,
    notes: 'Veteran-owned. 24/7 availability for emergency response.',
  },
  {
    id: 'dbe-008',
    companyName: 'Eastern Survey & Staking',
    ownerName: 'Jennifer Brown',
    address: '345 Precision Way',
    city: 'Morgantown',
    state: 'WV',
    zip: '26505',
    phone: '304-555-0808',
    email: 'jbrown@easternsurvey.com',
    certifications: ['DBE', 'WBE'],
    certifyingAgency: 'WVDOH',
    certificationExpires: '2025-07-31',
    naicsCodes: ['541370'],
    capabilities: ['Construction staking', 'GPS surveying', 'As-built surveys', 'Quantity surveys'],
    bondingCapacity: 500000,
    previousWVDOHWork: true,
    performanceRating: 4.7,
    notes: 'Licensed professional surveyors. Advanced GPS/GNSS equipment.',
  },
];

// ============================================
// SAMPLE RFIs
// ============================================

export interface RFI {
  id: string;
  number: string;
  subject: string;
  question: string;
  specReference?: string;
  planReference?: string;
  suggestedResponse?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING' | 'ANSWERED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  submittedDate?: string;
  responseDate?: string;
  response?: string;
  costImpact?: boolean;
  scheduleImpact?: boolean;
}

export const mockRFIs: RFI[] = [
  {
    id: 'rfi-001',
    number: 'RFI-001',
    subject: 'Rock Excavation Classification Criteria',
    question: 'Section 203 specifies that rock excavation will be paid when material cannot be excavated without blasting or ripping. Please clarify the specific criteria for determining when ripping is required versus when material can be excavated by conventional means. What equipment class will be used as the baseline for this determination?',
    specReference: 'Section 203.2',
    planReference: 'Sheet E-5',
    suggestedResponse: 'Rock excavation will be classified when material requires use of a CAT D9 or equivalent (minimum 400 HP) dozer with single-shank ripper and material still cannot be excavated. Field determination will be made jointly by Contractor and WVDOH inspector.',
    status: 'DRAFT',
    priority: 'HIGH',
    costImpact: true,
    scheduleImpact: false,
  },
  {
    id: 'rfi-002',
    number: 'RFI-002',
    subject: 'Utility Conflict at STA 245+00',
    question: 'The plans show a proposed 48" RCP storm drain crossing an existing Dominion Energy 138kV transmission line at Station 245+00. The minimum vertical clearance to the power lines appears to be less than 20 feet during construction. Please confirm coordination with Dominion Energy and provide required clearance procedures.',
    specReference: 'Section 702',
    planReference: 'Sheet D-15, U-3',
    suggestedResponse: 'Dominion Energy has been contacted and will de-energize the line during critical operations. A pre-construction meeting with Dominion is required. Contractor shall submit a detailed work plan showing equipment heights and sequence of operations.',
    status: 'DRAFT',
    priority: 'CRITICAL',
    costImpact: true,
    scheduleImpact: true,
  },
  {
    id: 'rfi-003',
    number: 'RFI-003',
    subject: 'Drilled Shaft Rock Socket Length',
    question: 'Addendum No. 3 added drilled shaft foundations at Bridge No. 3 but did not specify the required rock socket length. The geotechnical report indicates variable rock quality. Please provide minimum rock socket length requirements and criteria for field adjustment.',
    specReference: 'Section 506',
    planReference: 'Sheet S-8R',
    suggestedResponse: 'Minimum rock socket length shall be 1.5 times the shaft diameter (6 feet for 48" shafts) into competent rock with RQD > 50%. Field inspection by geotechnical engineer required. Additional rock socket length may be directed based on field conditions.',
    status: 'DRAFT',
    priority: 'HIGH',
    costImpact: true,
    scheduleImpact: true,
  },
  {
    id: 'rfi-004',
    number: 'RFI-004',
    subject: 'HMA Mix Design Approval Timeline',
    question: 'The specifications require mix design approval prior to HMA placement. Given the project timeline and the need for multiple mix designs (base, intermediate, surface), please confirm the expected turnaround time for mix design review and approval by WVDOH.',
    specReference: 'Section 411.3',
    suggestedResponse: 'WVDOH Materials Division typically requires 14 days for mix design review. Contractor should submit mix designs at least 30 days prior to anticipated paving operations. Multiple mix designs may be submitted simultaneously.',
    status: 'DRAFT',
    priority: 'MEDIUM',
    costImpact: false,
    scheduleImpact: true,
  },
  {
    id: 'rfi-005',
    number: 'RFI-005',
    subject: 'Erosion Control Blanket Type Selection',
    question: 'Section 656 allows multiple types of erosion control blankets. For slopes steeper than 2:1 in the cut sections, please specify the required blanket type and anchoring pattern.',
    specReference: 'Section 656',
    planReference: 'Sheet EC-8',
    suggestedResponse: 'For slopes steeper than 2:1, use Type 3 (permanent turf reinforcement mat) with 6-inch staples at 12-inch spacing on 12-inch staggered grid pattern. Joints shall be overlapped 4 inches minimum and stapled at 6-inch intervals.',
    status: 'DRAFT',
    priority: 'LOW',
    costImpact: true,
    scheduleImpact: false,
  },
];

// ============================================
// HAUL RESOURCES (Material Sources & Disposal Sites)
// ============================================

export interface HaulResource {
  id: string;
  name: string;
  type: 'QUARRY' | 'ASPHALT_PLANT' | 'CONCRETE_PLANT' | 'BORROW_PIT' | 'DISPOSAL_SITE' | 'BATCH_PLANT';
  address: string;
  city: string;
  state: string;
  coordinates: { lat: number; lng: number };
  distanceFromProject: number;
  travelTime: number;
  materials: string[];
  wvdohApproved: boolean;
  hourlyCapacity?: number;
  operatingHours?: string;
  contactName?: string;
  contactPhone?: string;
  notes?: string;
}

export const mockHaulResources: HaulResource[] = [
  {
    id: 'haul-001',
    name: 'Talbott Stone Quarry',
    type: 'QUARRY',
    address: '1500 Quarry Road',
    city: 'Talbott',
    state: 'WV',
    coordinates: { lat: 39.0234, lng: -79.9456 },
    distanceFromProject: 8.2,
    travelTime: 18,
    materials: ['Crushed stone', 'Aggregate base', 'Rip rap', '#57 stone', '#8 stone'],
    wvdohApproved: true,
    hourlyCapacity: 400,
    operatingHours: '6:00 AM - 6:00 PM M-F, 6:00 AM - 12:00 PM Sat',
    contactName: 'Mike Thompson',
    contactPhone: '304-555-1001',
    notes: 'Primary aggregate source. Can run night shifts with advance notice.',
  },
  {
    id: 'haul-002',
    name: 'Mountain State Aggregates',
    type: 'QUARRY',
    address: '2200 Rock Crusher Lane',
    city: 'Philippi',
    state: 'WV',
    coordinates: { lat: 39.1523, lng: -80.0432 },
    distanceFromProject: 22.1,
    travelTime: 38,
    materials: ['Crushed limestone', 'Aggregate base', 'Screenings', '#57 stone'],
    wvdohApproved: true,
    hourlyCapacity: 300,
    operatingHours: '5:00 AM - 5:00 PM M-F',
    contactName: 'Bill Jackson',
    contactPhone: '304-555-1002',
    notes: 'Backup aggregate source. Limestone excellent for base course.',
  },
  {
    id: 'haul-003',
    name: 'Elkins Asphalt LLC',
    type: 'ASPHALT_PLANT',
    address: '800 Industrial Boulevard',
    city: 'Elkins',
    state: 'WV',
    coordinates: { lat: 38.9256, lng: -79.8467 },
    distanceFromProject: 6.5,
    travelTime: 14,
    materials: ['Superpave 9.5mm', 'Superpave 12.5mm', 'Superpave 19mm', 'Base mix'],
    wvdohApproved: true,
    hourlyCapacity: 350,
    operatingHours: '4:00 AM - 10:00 PM during paving ops',
    contactName: 'Sarah Davis',
    contactPhone: '304-555-1003',
    notes: 'Closest HMA plant. Has PG 70-22 modified binder capability.',
  },
  {
    id: 'haul-004',
    name: 'Buckhannon Ready Mix',
    type: 'CONCRETE_PLANT',
    address: '450 Concrete Way',
    city: 'Buckhannon',
    state: 'WV',
    coordinates: { lat: 38.9934, lng: -80.2321 },
    distanceFromProject: 12.3,
    travelTime: 24,
    materials: ['Class A concrete', 'Class B concrete', 'HPC concrete', 'Flowable fill'],
    wvdohApproved: true,
    hourlyCapacity: 200,
    operatingHours: '5:00 AM - 7:00 PM M-Sat',
    contactName: 'Tom Reynolds',
    contactPhone: '304-555-1004',
    notes: 'Can batch HPC mixes. 45-minute delivery window from batch.',
  },
  {
    id: 'haul-005',
    name: 'Corridor H Borrow Site A',
    type: 'BORROW_PIT',
    address: 'Off Route 33, MP 15.5',
    city: 'Upshur County',
    state: 'WV',
    coordinates: { lat: 38.9876, lng: -80.1234 },
    distanceFromProject: 2.1,
    travelTime: 6,
    materials: ['Select borrow', 'Common borrow'],
    wvdohApproved: true,
    hourlyCapacity: 500,
    operatingHours: 'As needed during operations',
    contactName: 'WVDOH District 8',
    contactPhone: '304-555-1005',
    notes: 'WVDOH-provided borrow source. Pre-approved material - no testing required.',
  },
  {
    id: 'haul-006',
    name: 'Upshur County Landfill',
    type: 'DISPOSAL_SITE',
    address: '3500 Landfill Road',
    city: 'Buckhannon',
    state: 'WV',
    coordinates: { lat: 38.9654, lng: -80.1987 },
    distanceFromProject: 14.5,
    travelTime: 28,
    materials: ['Unsuitable material', 'Debris', 'Stumps/Brush'],
    wvdohApproved: true,
    operatingHours: '7:00 AM - 4:00 PM M-F, 7:00 AM - 12:00 PM Sat',
    contactName: 'County Solid Waste',
    contactPhone: '304-555-1006',
    notes: 'Tipping fee: $45/ton. No hazardous materials.',
  },
];

// ============================================
// PROJECT RISKS (for bid intelligence)
// ============================================

export interface BidRisk {
  id: string;
  category: 'GEOTECHNICAL' | 'UTILITY' | 'ENVIRONMENTAL' | 'SCHEDULE' | 'REGULATORY' | 'LABOR' | 'MATERIAL' | 'WEATHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  mitigation: string;
  estimatedImpact?: number;
  probability: number;
  identifiedDate: string;
  source?: string;
}

export const mockBidRisks: BidRisk[] = [
  {
    id: 'risk-001',
    category: 'GEOTECHNICAL',
    severity: 'HIGH',
    title: 'Variable Rock Conditions at Bridge No. 3',
    description: 'Geotechnical investigation reveals fractured and weathered rock at Bridge No. 3 location. Spread footings eliminated in favor of drilled shafts per Addendum 3, but actual rock socket depths may vary significantly.',
    mitigation: 'Include contingency for additional rock socket depth. Propose unit price adjustment for rock socket beyond design length. Schedule geotechnical engineer presence during shaft installation.',
    estimatedImpact: 150000,
    probability: 0.65,
    identifiedDate: '2024-12-18',
    source: 'Addendum 3, Geotechnical Report',
  },
  {
    id: 'risk-002',
    category: 'UTILITY',
    severity: 'CRITICAL',
    title: '138kV Transmission Line Conflict',
    description: 'Dominion Energy 138kV transmission line crosses project at STA 245+00. Outage coordination required for drainage installation. Limited outage windows may impact schedule.',
    mitigation: 'Contact Dominion immediately for outage scheduling. Include 2-week float in schedule for utility coordination. Consider night work during outage window.',
    estimatedImpact: 85000,
    probability: 0.80,
    identifiedDate: '2024-12-12',
    source: 'Plan Sheet U-3, Pre-bid site visit',
  },
  {
    id: 'risk-003',
    category: 'ENVIRONMENTAL',
    severity: 'MEDIUM',
    title: 'Stream Crossing Work Windows',
    description: 'Three perennial stream crossings subject to in-stream work restrictions. Army Corps permit limits work to June 1 - September 30. Late start could push crossing work to following year.',
    mitigation: 'Prioritize stream crossing earthwork in first construction season. Prepare contingency plan for temporary crossings if work extends beyond window.',
    estimatedImpact: 220000,
    probability: 0.45,
    identifiedDate: '2024-12-05',
    source: 'Environmental permits, Project specifications',
  },
  {
    id: 'risk-004',
    category: 'SCHEDULE',
    severity: 'HIGH',
    title: 'Compressed Paving Season',
    description: '540 working days with substantial completion October 2027. Limited paving season in mountain climate (May-October) creates schedule pressure for 20+ miles of HMA placement.',
    mitigation: 'Plan for two full paving seasons. Consider night paving to extend daily production. Pre-qualify multiple paving subcontractors.',
    estimatedImpact: 0,
    probability: 0.55,
    identifiedDate: '2024-12-01',
    source: 'Project schedule analysis',
  },
  {
    id: 'risk-005',
    category: 'LABOR',
    severity: 'MEDIUM',
    title: 'Skilled Labor Availability',
    description: 'Multiple large highway projects in WV Districts 7 and 8 competing for skilled operators and laborers. May face labor shortages during peak earthwork season.',
    mitigation: 'Secure key personnel commitments early. Consider housing allowance for out-of-area workers. Cross-train operators on multiple equipment types.',
    estimatedImpact: 120000,
    probability: 0.50,
    identifiedDate: '2024-12-10',
    source: 'Market analysis',
  },
  {
    id: 'risk-006',
    category: 'MATERIAL',
    severity: 'LOW',
    title: 'PG 70-22 Modified Binder Availability',
    description: 'Addendum 2 upgraded surface course binder to PG 70-22. Limited suppliers in region may impact pricing and availability during peak paving season.',
    mitigation: 'Confirm binder availability with Elkins Asphalt. Consider terminal pickup to ensure supply. Lock in pricing early.',
    estimatedImpact: 45000,
    probability: 0.30,
    identifiedDate: '2024-12-15',
    source: 'Addendum 2',
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function calculateTotalBid(items: BidItem[]): number {
  return items.reduce((sum, item) => sum + (item.extension || 0), 0);
}

export function getItemsByCategory(items: BidItem[], category: string): BidItem[] {
  return items.filter((item) => item.category === category);
}

export function getDBEOpportunities(items: BidItem[]): BidItem[] {
  return items.filter((item) => item.dbeOpportunity);
}

export function calculateDBEPotential(items: BidItem[], dbeItems: string[]): {
  totalDBE: number;
  percentage: number;
  meetsGoal: boolean;
} {
  const totalBid = calculateTotalBid(items);
  const dbeTotal = items
    .filter((item) => dbeItems.includes(item.itemNumber))
    .reduce((sum, item) => sum + (item.extension || 0), 0);
  const percentage = (dbeTotal / totalBid) * 100;

  return {
    totalDBE: dbeTotal,
    percentage,
    meetsGoal: percentage >= mockProject.dbeGoal,
  };
}

export function getAddendumImpact(addenda: Addendum[]): {
  totalIncrease: number;
  totalDecrease: number;
  netImpact: number;
  quantityChanges: number;
  specChanges: number;
  newItems: number;
} {
  let totalIncrease = 0;
  let totalDecrease = 0;
  let quantityChanges = 0;
  let specChanges = 0;
  let newItems = 0;

  addenda.forEach((addendum) => {
    addendum.changes.forEach((change) => {
      if (change.impactEstimate) {
        if (change.costImpact === 'INCREASE') {
          totalIncrease += change.impactEstimate;
        } else if (change.costImpact === 'DECREASE') {
          totalDecrease += Math.abs(change.impactEstimate);
        }
      }

      switch (change.changeType) {
        case 'QUANTITY':
          quantityChanges++;
          break;
        case 'SPECIFICATION':
          specChanges++;
          break;
        case 'NEW_ITEM':
          newItems++;
          break;
      }
    });
  });

  return {
    totalIncrease,
    totalDecrease,
    netImpact: totalIncrease - totalDecrease,
    quantityChanges,
    specChanges,
    newItems,
  };
}

export function searchSpecs(query: string, specs: SpecSection[]): SpecSection[] {
  const lowerQuery = query.toLowerCase();
  return specs
    .filter((spec) => {
      const matchesContent = spec.content.toLowerCase().includes(lowerQuery);
      const matchesTitle = spec.title.toLowerCase().includes(lowerQuery);
      const matchesKeywords = spec.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery));
      return matchesContent || matchesTitle || matchesKeywords;
    })
    .sort((a, b) => {
      // Prioritize title matches, then keyword matches, then content matches
      const aTitle = a.title.toLowerCase().includes(lowerQuery) ? 2 : 0;
      const bTitle = b.title.toLowerCase().includes(lowerQuery) ? 2 : 0;
      const aKeyword = a.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery)) ? 1 : 0;
      const bKeyword = b.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery)) ? 1 : 0;
      return (bTitle + bKeyword) - (aTitle + aKeyword);
    });
}

// ============================================
// CATEGORY SUMMARIES
// ============================================

export function getCategorySummary(items: BidItem[]): Array<{
  category: string;
  itemCount: number;
  totalValue: number;
  percentage: number;
}> {
  const totalBid = calculateTotalBid(items);
  const categories = [...new Set(items.map((item) => item.category))];

  return categories
    .map((category) => {
      const categoryItems = getItemsByCategory(items, category);
      const totalValue = categoryItems.reduce((sum, item) => sum + (item.extension || 0), 0);
      return {
        category,
        itemCount: categoryItems.length,
        totalValue,
        percentage: (totalValue / totalBid) * 100,
      };
    })
    .sort((a, b) => b.totalValue - a.totalValue);
}
