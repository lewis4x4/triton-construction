import { useMemo } from 'react';
import './DeadlineAlertBanner.css';

interface DeadlineAlertBannerProps {
  lettingDate: string | null;
  incompleteCount: number;
  totalItems: number;
  onReviewClick: () => void;
}

export function DeadlineAlertBanner({
  lettingDate,
  incompleteCount,
  totalItems,
  onReviewClick,
}: DeadlineAlertBannerProps) {
  const { urgencyLevel, deadlineText } = useMemo(() => {
    if (!lettingDate) {
      return { urgencyLevel: 'none', deadlineText: '' };
    }

    const deadline = new Date(lettingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let level: 'critical' | 'warning' | 'info' | 'none' = 'none';
    let text = '';

    if (diffDays < 0) {
      level = 'critical';
      text = `Deadline passed ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 0) {
      level = 'critical';
      text = 'Due TODAY';
    } else if (diffDays === 1) {
      level = 'critical';
      text = 'Due TOMORROW';
    } else if (diffDays <= 3) {
      level = 'critical';
      text = `Due in ${diffDays} days`;
    } else if (diffDays <= 7) {
      level = 'warning';
      text = `Due in ${diffDays} days`;
    } else if (diffDays <= 14) {
      level = 'info';
      text = `Due in ${diffDays} days`;
    }

    return { urgencyLevel: level, deadlineText: text };
  }, [lettingDate]);

  // Don't show banner if no urgency or no incomplete items
  if (urgencyLevel === 'none' || incompleteCount === 0) {
    return null;
  }

  const completionPercentage = totalItems > 0
    ? Math.round(((totalItems - incompleteCount) / totalItems) * 100)
    : 100;

  const getUrgencyIcon = () => {
    switch (urgencyLevel) {
      case 'critical':
        return '🚨';
      case 'warning':
        return '⚠️';
      case 'info':
        return '📅';
      default:
        return '';
    }
  };

  return (
    <div className={`deadline-alert-banner ${urgencyLevel}`}>
      <div className="banner-content">
        <div className="banner-icon">{getUrgencyIcon()}</div>

        <div className="banner-text">
          <div className="banner-headline">
            <span className="deadline-badge">{deadlineText}</span>
            <span className="incomplete-count">
              {incompleteCount} item{incompleteCount !== 1 ? 's' : ''} need{incompleteCount === 1 ? 's' : ''} pricing
            </span>
          </div>

          <div className="banner-progress">
            <div className="progress-bar-small">
              <div
                className="progress-fill-small"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="progress-text-small">{completionPercentage}% complete</span>
          </div>
        </div>

        <button className="btn-review-now" onClick={onReviewClick}>
          Review Now →
        </button>
      </div>
    </div>
  );
}
