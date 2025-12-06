// Re-export generated database types
export * from './database';

// Application-specific types
export type UserRole =
  | 'ADMIN'
  | 'EXECUTIVE'
  | 'PROJECT_MANAGER'
  | 'SUPERINTENDENT'
  | 'FOREMAN'
  | 'FIELD_USER';

export type ProjectStatus =
  | 'PLANNING'
  | 'BIDDING'
  | 'AWARDED'
  | 'MOBILIZATION'
  | 'ACTIVE'
  | 'SUBSTANTIAL_COMPLETION'
  | 'PUNCH_LIST'
  | 'COMPLETE'
  | 'CLOSED';

export type DailyReportStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'REVIEWED'
  | 'APPROVED'
  | 'REJECTED'
  | 'REVISED';

export type TimeEntryStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID';
