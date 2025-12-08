// WV811 Photo Evidence Categories
// Comprehensive categorization system for the "Evidence Locker"

export type PhotoCategoryGroup =
  | 'pre_excavation'
  | 'utility_marks'
  | 'active_excavation'
  | 'restoration'
  | 'liability'
  | 'emergency';

export interface PhotoCategory {
  id: string;
  group: PhotoCategoryGroup;
  label: string;
  description: string;
  icon: string;          // Lucide icon name
  color: string;         // Hex color for UI
  required?: boolean;    // If this photo type is required for compliance
  promptTrigger?: string; // When to auto-prompt for this photo type
}

export interface PhotoCategoryGroupInfo {
  id: PhotoCategoryGroup;
  label: string;
  description: string;
  sortOrder: number;
}

// Category Groups
export const PHOTO_CATEGORY_GROUPS: Record<PhotoCategoryGroup, { label: string; description: string; sortOrder: number }> = {
  pre_excavation: {
    label: 'Pre-Excavation / Compliance',
    description: 'Photos proving you followed the rules before digging',
    sortOrder: 1,
  },
  utility_marks: {
    label: 'Utility Markings',
    description: 'Documentation of utility paint marks and flags',
    sortOrder: 2,
  },
  active_excavation: {
    label: 'Active Excavation',
    description: 'In-progress dig site documentation',
    sortOrder: 3,
  },
  restoration: {
    label: 'Restoration & Closeout',
    description: 'Site restoration and final condition photos',
    sortOrder: 4,
  },
  liability: {
    label: 'Liability Protection',
    description: 'Pre-existing conditions and access issues',
    sortOrder: 5,
  },
  emergency: {
    label: 'Emergency / Incident',
    description: 'Damage, strikes, and emergency documentation',
    sortOrder: 6,
  },
};

// All Photo Categories
export const PHOTO_CATEGORIES: PhotoCategory[] = [
  // ===== PRE-EXCAVATION / COMPLIANCE =====
  {
    id: 'site_overview_white_lines',
    group: 'pre_excavation',
    label: 'Site Overview (White Lines)',
    description: 'Wide shot showing the area marked for locators to check',
    icon: 'MapPin',
    color: '#3b82f6',
    required: true,
  },
  {
    id: 'ticket_posting',
    group: 'pre_excavation',
    label: 'Ticket Posting',
    description: 'Physical paper ticket posted at the job site',
    icon: 'FileText',
    color: '#8b5cf6',
  },
  {
    id: 'pre_excavation_condition',
    group: 'pre_excavation',
    label: 'Pre-Excavation Condition',
    description: 'Site condition just before digging begins',
    icon: 'Camera',
    color: '#06b6d4',
    required: true,
  },

  // ===== UTILITY MARKINGS =====
  {
    id: 'marks_electric',
    group: 'utility_marks',
    label: 'Electric Marks (RED)',
    description: 'Red paint marks indicating electric utility lines',
    icon: 'Zap',
    color: '#ef4444',
  },
  {
    id: 'marks_gas',
    group: 'utility_marks',
    label: 'Gas/Oil Marks (YELLOW)',
    description: 'Yellow paint marks indicating gas, oil, or petroleum lines',
    icon: 'Flame',
    color: '#eab308',
  },
  {
    id: 'marks_telecom',
    group: 'utility_marks',
    label: 'Telecom/Signal Marks (ORANGE)',
    description: 'Orange paint marks indicating telecom, cable, or signal lines',
    icon: 'Phone',
    color: '#f97316',
  },
  {
    id: 'marks_water',
    group: 'utility_marks',
    label: 'Water Marks (BLUE)',
    description: 'Blue paint marks indicating water lines',
    icon: 'Droplet',
    color: '#3b82f6',
  },
  {
    id: 'marks_sewer',
    group: 'utility_marks',
    label: 'Sewer/Storm Marks (GREEN)',
    description: 'Green paint marks indicating sewer or storm drain lines',
    icon: 'Waves',
    color: '#22c55e',
  },
  {
    id: 'marks_reclaimed',
    group: 'utility_marks',
    label: 'Reclaimed Water (PURPLE)',
    description: 'Purple paint marks indicating reclaimed water lines',
    icon: 'Droplets',
    color: '#a855f7',
  },
  {
    id: 'marks_survey',
    group: 'utility_marks',
    label: 'Survey/Temporary (PINK)',
    description: 'Pink paint marks for survey or temporary markings',
    icon: 'Target',
    color: '#ec4899',
  },
  {
    id: 'marks_excavation',
    group: 'utility_marks',
    label: 'Excavation Outline (WHITE)',
    description: 'White paint showing proposed excavation boundary',
    icon: 'Square',
    color: '#6b7280',
  },
  {
    id: 'no_marks_48hr',
    group: 'utility_marks',
    label: '48-Hour No Marks (Silent Assent)',
    description: 'Photo showing NO marks after 48-hour wait period - critical insurance',
    icon: 'Clock',
    color: '#f59e0b',
    required: true,
    promptTrigger: 'silent_assent',
  },
  {
    id: 'marks_positive_all',
    group: 'utility_marks',
    label: 'All Marks Overview',
    description: 'Wide shot showing all utility markings in area',
    icon: 'Scan',
    color: '#14b8a6',
  },

  // ===== ACTIVE EXCAVATION =====
  {
    id: 'potholing',
    group: 'active_excavation',
    label: 'Potholing / Daylighting',
    description: 'Utility line visually exposed by hand digging before mechanical work',
    icon: 'Search',
    color: '#8b5cf6',
  },
  {
    id: 'trench_open',
    group: 'active_excavation',
    label: 'Trench / Open Pit',
    description: 'Daily progress photo of open excavation',
    icon: 'Layers',
    color: '#f97316',
  },
  {
    id: 'excavation_progress',
    group: 'active_excavation',
    label: 'Excavation Progress',
    description: 'General in-progress excavation documentation',
    icon: 'Truck',
    color: '#eab308',
  },
  {
    id: 'traffic_control',
    group: 'active_excavation',
    label: 'Traffic Control / MOT',
    description: 'Barrels, cones, signage, arrow boards, lane closures',
    icon: 'AlertTriangle',
    color: '#ef4444',
  },
  {
    id: 'equipment_on_site',
    group: 'active_excavation',
    label: 'Equipment On Site',
    description: 'Documentation of equipment used at dig site',
    icon: 'Truck',
    color: '#64748b',
  },

  // ===== RESTORATION & CLOSEOUT =====
  {
    id: 'backfill',
    group: 'restoration',
    label: 'Backfill',
    description: 'Trench being backfilled with material',
    icon: 'Layers',
    color: '#78716c',
  },
  {
    id: 'restoration_grade',
    group: 'restoration',
    label: 'Final Grade / Restoration',
    description: 'Site backfilled, seeded, and strawed',
    icon: 'Check',
    color: '#22c55e',
    required: true,
  },
  {
    id: 'pavement_restoration',
    group: 'restoration',
    label: 'Pavement Restoration',
    description: 'Asphalt or concrete repair completed',
    icon: 'Square',
    color: '#374151',
  },
  {
    id: 'final_condition',
    group: 'restoration',
    label: 'Final Condition / Turnover',
    description: 'State of site when crew leaves - for disputes',
    icon: 'CheckCircle',
    color: '#22c55e',
    required: true,
  },

  // ===== LIABILITY PROTECTION =====
  {
    id: 'pre_existing_damage',
    group: 'liability',
    label: 'Pre-Existing Damage',
    description: 'Cracked sidewalks, damaged fences, ruts that existed before arrival',
    icon: 'AlertOctagon',
    color: '#ef4444',
  },
  {
    id: 'obstruction_no_access',
    group: 'liability',
    label: 'Obstruction / No Access',
    description: 'Locked gate, dog, blocked road preventing access',
    icon: 'Ban',
    color: '#dc2626',
  },
  {
    id: 'weather_conditions',
    group: 'liability',
    label: 'Weather Conditions',
    description: 'Heavy rain, snow, flooding, fog affecting work or marks',
    icon: 'CloudRain',
    color: '#6366f1',
  },
  {
    id: 'conflict_obstruction',
    group: 'liability',
    label: 'Conflict / Design Issue',
    description: 'Marking over planned footing, unexpected obstruction',
    icon: 'AlertTriangle',
    color: '#f59e0b',
  },
  {
    id: 'work_area_change',
    group: 'liability',
    label: 'Work Area Adjustment',
    description: 'Documentation when site is extended or shifted',
    icon: 'Move',
    color: '#8b5cf6',
  },

  // ===== EMERGENCY / INCIDENT =====
  {
    id: 'damage_strike',
    group: 'emergency',
    label: 'Damage / Utility Strike',
    description: 'IMMEDIATE documentation of any utility strike or damage',
    icon: 'AlertTriangle',
    color: '#dc2626',
    promptTrigger: 'dig_up',
  },
  {
    id: 'emergency_initial',
    group: 'emergency',
    label: 'Emergency - Initial Condition',
    description: 'First photos when emergency dig-up is activated',
    icon: 'Siren',
    color: '#dc2626',
    promptTrigger: 'dig_up',
  },
  {
    id: 'emergency_secured',
    group: 'emergency',
    label: 'Emergency - After Securing',
    description: 'Photos after site has been made safe',
    icon: 'ShieldCheck',
    color: '#f97316',
    promptTrigger: 'dig_up',
  },
];

// Helper function to get categories by group
export function getCategoriesByGroup(group: PhotoCategoryGroup): PhotoCategory[] {
  return PHOTO_CATEGORIES.filter((cat) => cat.group === group);
}

// Helper function to get category by ID
export function getCategoryById(id: string): PhotoCategory | undefined {
  return PHOTO_CATEGORIES.find((cat) => cat.id === id);
}

// Helper function to get required categories
export function getRequiredCategories(): PhotoCategory[] {
  return PHOTO_CATEGORIES.filter((cat) => cat.required);
}

// Helper function to get categories for a prompt trigger
export function getCategoriesForTrigger(trigger: string): PhotoCategory[] {
  return PHOTO_CATEGORIES.filter((cat) => cat.promptTrigger === trigger);
}

// Utility mark color mapping (APWA standard)
export const UTILITY_MARK_COLORS = {
  red: { utility: 'Electric', description: 'Power lines, cables, conduit' },
  yellow: { utility: 'Gas/Oil/Steam', description: 'Gas, oil, steam, petroleum' },
  orange: { utility: 'Communications', description: 'Telecom, cable TV, signal lines' },
  blue: { utility: 'Water', description: 'Potable water' },
  green: { utility: 'Sewer/Drain', description: 'Sewer, storm drain' },
  purple: { utility: 'Reclaimed Water', description: 'Reclaimed water, irrigation' },
  pink: { utility: 'Survey/Temporary', description: 'Survey markers, temporary marks' },
  white: { utility: 'Proposed Excavation', description: 'Excavation boundary' },
} as const;

// Quick capture categories (most common, shown as large buttons)
export const QUICK_CAPTURE_CATEGORIES = [
  'marks_positive_all',
  'no_marks_48hr',
  'pre_excavation_condition',
  'trench_open',
  'final_condition',
  'damage_strike',
];

// ===== PREDICTIVE ORDERING =====
// Map utility types from ticket to photo category IDs
const UTILITY_TO_CATEGORY_MAP: Record<string, string> = {
  // Gas utilities
  gas: 'marks_gas',
  mountaineer: 'marks_gas',
  dominion_gas: 'marks_gas',
  'natural gas': 'marks_gas',
  propane: 'marks_gas',
  // Electric utilities
  electric: 'marks_electric',
  power: 'marks_electric',
  aep: 'marks_electric',
  'mon power': 'marks_electric',
  monpower: 'marks_electric',
  appalachian: 'marks_electric',
  // Telecom/Cable
  telecom: 'marks_telecom',
  frontier: 'marks_telecom',
  suddenlink: 'marks_telecom',
  comcast: 'marks_telecom',
  att: 'marks_telecom',
  verizon: 'marks_telecom',
  fiber: 'marks_telecom',
  cable: 'marks_telecom',
  // Water
  water: 'marks_water',
  municipal: 'marks_water',
  wvaw: 'marks_water',
  'west virginia american': 'marks_water',
  // Sewer
  sewer: 'marks_sewer',
  storm: 'marks_sewer',
  drain: 'marks_sewer',
  sanitary: 'marks_sewer',
};

/**
 * Visual grouping for category display
 * Groups 27 categories into 4 visual buckets for easier selection
 */
export const VISUAL_CATEGORY_GROUPS = {
  prework: {
    label: 'Pre-Work',
    icon: 'ClipboardCheck',
    categories: ['site_overview_white_lines', 'ticket_posting', 'pre_excavation_condition', 'marks_excavation'],
  },
  evidence: {
    label: 'Evidence (Paint)',
    icon: 'Palette',
    categories: [
      'marks_electric',
      'marks_gas',
      'marks_telecom',
      'marks_water',
      'marks_sewer',
      'marks_reclaimed',
      'marks_survey',
      'marks_positive_all',
      'no_marks_48hr',
    ],
  },
  progress: {
    label: 'Progress',
    icon: 'HardHat',
    categories: [
      'potholing',
      'trench_open',
      'excavation_progress',
      'traffic_control',
      'equipment_on_site',
      'backfill',
    ],
  },
  closeout: {
    label: 'Closeout',
    icon: 'CheckCircle2',
    categories: [
      'restoration_grade',
      'pavement_restoration',
      'final_condition',
      'pre_existing_damage',
      'obstruction_no_access',
      'weather_conditions',
      'conflict_obstruction',
      'work_area_change',
      'damage_strike',
      'emergency_initial',
      'emergency_secured',
    ],
  },
};

/**
 * Get categories ordered predictively based on ticket utilities
 * Moves relevant utility mark categories to the top
 */
export function getPredictiveCategories(ticketUtilities: string[]): PhotoCategory[] {
  // Normalize utility names
  const normalizedUtilities = ticketUtilities.map((u) => u.toLowerCase().trim());

  // Find matching category IDs based on utilities
  const prioritizedCategoryIds = new Set<string>();

  for (const utility of normalizedUtilities) {
    // Check each keyword in our map
    for (const [keyword, categoryId] of Object.entries(UTILITY_TO_CATEGORY_MAP)) {
      if (utility.includes(keyword)) {
        prioritizedCategoryIds.add(categoryId);
      }
    }
  }

  // Sort categories: prioritized ones first, then by group order
  const sortedCategories = [...PHOTO_CATEGORIES].sort((a, b) => {
    const aPrioritized = prioritizedCategoryIds.has(a.id);
    const bPrioritized = prioritizedCategoryIds.has(b.id);

    // Prioritized categories come first
    if (aPrioritized && !bPrioritized) return -1;
    if (!aPrioritized && bPrioritized) return 1;

    // Then sort by group order
    const aGroupOrder = PHOTO_CATEGORY_GROUPS[a.group]?.sortOrder || 99;
    const bGroupOrder = PHOTO_CATEGORY_GROUPS[b.group]?.sortOrder || 99;
    return aGroupOrder - bGroupOrder;
  });

  return sortedCategories;
}

/**
 * Get quick capture categories based on ticket context
 * Returns the 6 most relevant categories for large button display
 */
export function getContextualQuickCapture(ticketUtilities: string[], hasGas: boolean, hasElectric: boolean): string[] {
  const quickCapture: string[] = [];

  // Always include site overview and pre-excavation
  quickCapture.push('site_overview_white_lines');
  quickCapture.push('pre_excavation_condition');

  // Add relevant utility marks
  if (hasGas) {
    quickCapture.push('marks_gas');
  }
  if (hasElectric) {
    quickCapture.push('marks_electric');
  }

  // Add based on utilities if not already covered
  const normalizedUtilities = ticketUtilities.map((u) => u.toLowerCase());
  for (const utility of normalizedUtilities) {
    if (quickCapture.length >= 5) break;

    if ((utility.includes('water') || utility.includes('wvaw')) && !quickCapture.includes('marks_water')) {
      quickCapture.push('marks_water');
    }
    if ((utility.includes('telecom') || utility.includes('frontier') || utility.includes('cable')) &&
        !quickCapture.includes('marks_telecom')) {
      quickCapture.push('marks_telecom');
    }
  }

  // Fill remaining slots with defaults
  const defaults = ['marks_positive_all', 'trench_open', 'final_condition', 'damage_strike'];
  for (const def of defaults) {
    if (quickCapture.length >= 6) break;
    if (!quickCapture.includes(def)) {
      quickCapture.push(def);
    }
  }

  return quickCapture.slice(0, 6);
}

/**
 * Get categories grouped into visual buckets for easier navigation
 */
export function getCategoriesGroupedByVisual(): Array<{
  group: keyof typeof VISUAL_CATEGORY_GROUPS;
  label: string;
  icon: string;
  categories: PhotoCategory[];
}> {
  return Object.entries(VISUAL_CATEGORY_GROUPS).map(([groupKey, group]) => ({
    group: groupKey as keyof typeof VISUAL_CATEGORY_GROUPS,
    label: group.label,
    icon: group.icon,
    categories: group.categories
      .map((id) => PHOTO_CATEGORIES.find((c) => c.id === id))
      .filter((c): c is PhotoCategory => c !== undefined),
  }));
}
