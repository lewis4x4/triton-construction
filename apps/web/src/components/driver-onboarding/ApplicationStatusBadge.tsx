import {
  FileEdit,
  Clock,
  FileQuestion,
  Search,
  CheckCircle,
  XCircle,
  Ban
} from 'lucide-react';
import type { ApplicationStatus } from './types';
import './ApplicationStatusBadge.css';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<ApplicationStatus, {
  label: string;
  icon: React.ElementType;
  className: string;
}> = {
  DRAFT: {
    label: 'Draft',
    icon: FileEdit,
    className: 'status-draft',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    icon: Clock,
    className: 'status-in-progress',
  },
  PENDING_DOCUMENTS: {
    label: 'Pending Documents',
    icon: FileQuestion,
    className: 'status-pending-docs',
  },
  PENDING_VERIFICATION: {
    label: 'Pending Verification',
    icon: Search,
    className: 'status-pending-verify',
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle,
    className: 'status-approved',
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
    className: 'status-rejected',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    icon: Ban,
    className: 'status-withdrawn',
  },
};

export function ApplicationStatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: ApplicationStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;

  return (
    <span className={`application-status-badge ${config.className} size-${size}`}>
      {showIcon && <Icon size={iconSize} />}
      <span className="status-label">{config.label}</span>
    </span>
  );
}
