import { type ReactNode } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock, Eye, MinusCircle } from 'lucide-react';

// Ticket-level status (wv811_ticket_status enum)
export type TicketStatus = 'RECEIVED' | 'PENDING' | 'IN_PROGRESS' | 'CLEAR' | 'CONFLICT' | 'EXPIRED' | 'CANCELLED';

interface StatusBadgeProps {
  status: TicketStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<TicketStatus, { label: string; className: string; icon: ReactNode }> = {
  RECEIVED: {
    label: 'Received',
    className: 'badge-gray',
    icon: null,
  },
  PENDING: {
    label: 'Pending',
    className: 'badge-blue',
    icon: null,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'badge-purple',
    icon: null,
  },
  CLEAR: {
    label: 'Clear',
    className: 'badge-green',
    icon: null,
  },
  CONFLICT: {
    label: 'Conflict',
    className: 'badge-red',
    icon: null,
  },
  EXPIRED: {
    label: 'Expired',
    className: 'badge-orange',
    icon: null,
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'badge-gray',
    icon: null,
  },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.PENDING;

  const sizeClass = size === 'sm' ? 'badge-sm' : size === 'lg' ? 'badge-lg' : '';

  return (
    <span className={`ticket-badge ${config.className} ${sizeClass}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// Legacy utility response type (wv811_utility_response_type enum)
export type UtilityResponseType = 'CLEAR' | 'MARKED' | 'CONFLICT' | 'NO_RESPONSE' | 'NOT_APPLICABLE' | 'PENDING';

interface UtilityBadgeProps {
  response: UtilityResponseType;
}

const utilityConfig: Record<UtilityResponseType, { label: string; className: string }> = {
  CLEAR: { label: 'Clear', className: 'badge-green' },
  MARKED: { label: 'Marked', className: 'badge-blue' },
  CONFLICT: { label: 'Conflict', className: 'badge-red' },
  NO_RESPONSE: { label: 'No Response', className: 'badge-orange' },
  NOT_APPLICABLE: { label: 'N/A', className: 'badge-gray' },
  PENDING: { label: 'Pending', className: 'badge-yellow' },
};

export function UtilityBadge({ response }: UtilityBadgeProps) {
  const config = utilityConfig[response] || utilityConfig.PENDING;

  return (
    <span className={`ticket-badge badge-sm ${config.className}`}>
      {config.label}
    </span>
  );
}

// =============================================================================
// NEW: Utility Response Status (wv811_response_status enum)
// Per WV Law - 2 business days for utility response
// IMPORTANT: WV does NOT have true "Silent Assent" - excavators proceed at own risk
// =============================================================================

export type ResponseStatus =
  | 'PENDING'           // Within 2 business day window, awaiting response
  | 'CLEAR'             // Utility confirmed no conflict / clear to dig
  | 'MARKED'            // Utility confirmed facilities marked on site
  | 'UNVERIFIED'        // 2 business day window closed, no response (proceed at risk)
  | 'VERIFIED_ON_SITE'  // Foreman verified marks in field
  | 'CONFLICT'          // Utility or crew reported conflict - DO NOT DIG
  | 'NOT_APPLICABLE';   // Utility has no facilities in area

interface ResponseStatusBadgeProps {
  status: ResponseStatus | null;
  showIcon?: boolean;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  windowClosesAt?: string | null; // For countdown display
}

interface StatusConfigItem {
  label: string;
  className: string;
  icon: ReactNode;
  description: string;
  isWarning?: boolean;
}

const responseStatusConfig: Record<ResponseStatus, StatusConfigItem> = {
  PENDING: {
    label: 'Pending',
    className: 'badge-yellow',
    icon: <Clock size={14} />,
    description: 'Utility has not yet responded. 2 business day response window still open.',
  },
  CLEAR: {
    label: 'Clear',
    className: 'badge-green',
    icon: <CheckCircle size={14} />,
    description: 'Utility confirmed no conflict or no facilities in area.',
  },
  MARKED: {
    label: 'Marked',
    className: 'badge-green',
    icon: <CheckCircle size={14} />,
    description: 'Utility confirmed facilities have been marked on site.',
  },
  UNVERIFIED: {
    label: 'Unverified',
    className: 'badge-orange',
    icon: <AlertTriangle size={14} />,
    description: 'Response window closed with no confirmation. May proceed AT YOUR OWN RISK. WV law does NOT exempt you from damages.',
    isWarning: true,
  },
  VERIFIED_ON_SITE: {
    label: 'Verified',
    className: 'badge-teal',
    icon: <Eye size={14} />,
    description: 'Marks verified on site by field crew.',
  },
  CONFLICT: {
    label: 'CONFLICT',
    className: 'badge-red',
    icon: <XCircle size={14} />,
    description: 'Utility or crew reported a conflict. DO NOT DIG until resolved.',
    isWarning: true,
  },
  NOT_APPLICABLE: {
    label: 'N/A',
    className: 'badge-gray',
    icon: <MinusCircle size={14} />,
    description: 'Utility has no facilities in this area.',
  },
};

export function ResponseStatusBadge({
  status,
  showIcon = true,
  showTooltip = false,
  size = 'md',
  windowClosesAt,
}: ResponseStatusBadgeProps) {
  const effectiveStatus = status || 'PENDING';
  const config = responseStatusConfig[effectiveStatus];
  const sizeClass = size === 'sm' ? 'badge-sm' : size === 'lg' ? 'badge-lg' : '';

  // Calculate time remaining for PENDING status
  let timeRemaining = '';
  if (effectiveStatus === 'PENDING' && windowClosesAt) {
    const now = new Date();
    const closes = new Date(windowClosesAt);
    const hoursLeft = Math.max(0, (closes.getTime() - now.getTime()) / (1000 * 60 * 60));

    if (hoursLeft > 24) {
      const daysLeft = Math.ceil(hoursLeft / 24);
      timeRemaining = `${daysLeft}d`;
    } else if (hoursLeft > 0) {
      timeRemaining = `${Math.ceil(hoursLeft)}hr`;
    }
  }

  const badge = (
    <span
      className={`ticket-badge ${config.className} ${sizeClass} ${config.isWarning ? 'badge-warning-pulse' : ''}`}
      title={showTooltip ? config.description : undefined}
    >
      {showIcon && config.icon}
      {config.label}
      {timeRemaining && <span className="badge-countdown">({timeRemaining})</span>}
    </span>
  );

  return badge;
}

// =============================================================================
// Utility Response Row Component (for table display)
// =============================================================================

interface UtilityResponseRowProps {
  utilityName: string;
  utilityCode: string;
  utilityType?: string | null;
  responseStatus: ResponseStatus | null;
  responseType?: UtilityResponseType; // Legacy field
  windowClosesAt?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  conflictReason?: string | null;
}

export function UtilityResponseStatus({
  utilityName,
  utilityCode,
  utilityType,
  responseStatus,
  responseType,
  windowClosesAt,
  verifiedBy,
  verifiedAt,
  conflictReason,
}: UtilityResponseRowProps) {
  const effectiveStatus = responseStatus || (responseType as ResponseStatus) || 'PENDING';

  return (
    <div className="utility-response-status">
      <div className="utility-info">
        <span className="utility-name">{utilityName}</span>
        {utilityType && <span className="utility-type">{utilityType}</span>}
        <span className="utility-code">{utilityCode}</span>
      </div>

      <div className="response-info">
        <ResponseStatusBadge
          status={effectiveStatus as ResponseStatus}
          showIcon={true}
          windowClosesAt={windowClosesAt}
        />

        {/* Show additional context based on status */}
        {effectiveStatus === 'UNVERIFIED' && (
          <div className="response-warning">
            <AlertTriangle size={12} />
            <span>May proceed at own risk - not exempt from damages</span>
          </div>
        )}

        {effectiveStatus === 'VERIFIED_ON_SITE' && verifiedAt && (
          <div className="response-meta">
            Verified {new Date(verifiedAt).toLocaleDateString()}
            {verifiedBy && ` by ${verifiedBy}`}
          </div>
        )}

        {effectiveStatus === 'CONFLICT' && conflictReason && (
          <div className="response-conflict-reason">
            <strong>Reason:</strong> {conflictReason}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Dig Status Result Badge (for "Can I Dig Here Today?" results)
// =============================================================================

export type DigCheckResult = 'PASS' | 'CAUTION' | 'WARNING' | 'FAIL';

interface DigCheckBadgeProps {
  result: DigCheckResult;
  message?: string;
}

const digCheckConfig: Record<DigCheckResult, { label: string; className: string; icon: ReactNode }> = {
  PASS: {
    label: 'ALL CLEAR',
    className: 'dig-badge-green',
    icon: <CheckCircle size={20} />,
  },
  CAUTION: {
    label: 'PROCEED WITH CAUTION',
    className: 'dig-badge-orange',
    icon: <AlertTriangle size={20} />,
  },
  WARNING: {
    label: 'WAIT OR VERIFY',
    className: 'dig-badge-yellow',
    icon: <Clock size={20} />,
  },
  FAIL: {
    label: 'DO NOT DIG',
    className: 'dig-badge-red',
    icon: <XCircle size={20} />,
  },
};

export function DigCheckBadge({ result, message }: DigCheckBadgeProps) {
  const config = digCheckConfig[result];

  return (
    <div className={`dig-check-result ${config.className}`}>
      <div className="dig-check-header">
        {config.icon}
        <span className="dig-check-label">{config.label}</span>
      </div>
      {message && <p className="dig-check-message">{message}</p>}
    </div>
  );
}
