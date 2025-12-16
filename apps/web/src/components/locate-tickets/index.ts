// WV811 Locate Tickets Components

// ============================================
// Sprint 2: Audit & Safety Components
// ============================================

// Emergency Dig Up - One-Click emergency reporting
export { EmergencyDigUp, EmergencyDigUpButton } from './EmergencyDigUp';

// Photo Verification - 48hr verification prompts
export { PhotoVerificationPrompt, PhotoVerificationButton } from './PhotoVerificationPrompt';

// Alert Acknowledgement - Tracking sent/delivered/acknowledged
export { AlertAcknowledgementBanner, AlertNotificationBadge, usePendingAlertCount } from './AlertAcknowledgement';

// Conflict Resolution - Log and resolve utility conflicts
export { ConflictResolutionModal, ConflictBadge, LogConflictModal } from './ConflictResolution';

// Verify Marks On-Site - Field verification of utility marks
export { VerifyMarksOnSite, VerifiedBadge } from './VerifyMarksOnSite';

// ============================================
// Sprint 3: Offline & UX Components
// ============================================

// Can I Dig Here - Offline-capable dig status check
export { CanIDigHere } from './CanIDigHere';

// Safe Zone Map - Visual map with ticket locations and radius overlays
export { SafeZoneMap } from './SafeZoneMap';

// Offline Sync Status - Sync indicator and manual refresh
export { OfflineSyncStatus, useSyncStatus } from './OfflineSyncStatus';

// ============================================
// Sprint 4: Polish Components
// ============================================

// Ticket Analytics Dashboard - Key metrics and trends
export { TicketAnalyticsDashboard } from './TicketAnalyticsDashboard';

// Multi-Crew Coordination - Nearby crews and conflict alerts
export { MultiCrewCoordination, NearbyCrewsWidget } from './MultiCrewCoordination';

// Ticket Renewal - Chain management and renewal workflow
export { TicketRenewalModal, RenewalButton } from './TicketRenewal';

// Polygon Drawing Tool - Draw dig area boundaries on map
export { PolygonDrawingTool, DrawDigAreaButton } from './PolygonDrawingTool';

// ============================================
// Core UI Components
// ============================================

// Location Map - Interactive Mapbox map with geocoding
export { LocationMap } from './LocationMap';

// Enhanced Location Map - Satellite/terrain styles, 3D, safe zones, photo pins
export { EnhancedLocationMap } from './EnhancedLocationMap';

// Request Re-mark Modal - Request utility re-marking
export { RequestRemarkModal } from './RequestRemarkModal';

// Photo Upload - Upload photos with EXIF extraction and AI-ready metadata
export { PhotoUpload } from './PhotoUpload';

// Photo Capture Modal - Evidence photo capture with category selection
export { PhotoCaptureModal } from './PhotoCaptureModal';

// Photo Categories - Category definitions and utilities
export * from './photoCategories';

// ============================================
// Dig Readiness Check Components
// ============================================

// Personnel Selector - Multi-select crew/sub workers with cert status
export { PersonnelSelector } from './PersonnelSelector';

// Dig Readiness Results - Comprehensive check results display
export { DigReadinessResults, type DigReadinessResult } from './DigReadinessResults';
