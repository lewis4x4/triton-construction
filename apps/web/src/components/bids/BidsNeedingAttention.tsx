import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@triton/supabase-client';
import { useAuth } from '../../hooks/useAuth';
import {
  AlertTriangle,
  Calendar,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import './BidsNeedingAttention.css';

interface BidWithAttention {
  id: string;
  project_name: string;
  letting_date: string;
  status: string;
  incomplete_count: number;
  total_items: number;
  days_until: number;
}

export function BidsNeedingAttention() {
  const { profile } = useAuth();
  const [bids, setBids] = useState<BidWithAttention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBidsNeedingAttention = useCallback(async () => {
    if (!profile?.organization_id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Query bids with approaching deadlines (within 14 days) that have incomplete pricing
      const { data: bidsData, error: bidsError } = await supabase
        .from('bid_projects')
        .select(`
          id,
          project_name,
          letting_date,
          status,
          bid_line_items!left (
            id,
            final_unit_price,
            pricing_reviewed
          )
        `)
        .eq('organization_id', profile.organization_id)
        .in('status', ['DRAFT', 'ESTIMATING', 'REVIEW'])
        .not('letting_date', 'is', null)
        .gte('letting_date', new Date().toISOString().split('T')[0])
        .lte('letting_date', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('letting_date', { ascending: true })
        .limit(5);

      if (bidsError) throw bidsError;

      // Process the data to calculate incomplete counts
      const processedBids: BidWithAttention[] = (bidsData || [])
        .map((bid: any) => {
          const lineItems = bid.bid_line_items || [];
          const totalItems = lineItems.length;
          const incompleteCount = lineItems.filter(
            (item: any) => !item.final_unit_price || !item.pricing_reviewed
          ).length;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lettingDate = new Date(bid.letting_date);
          lettingDate.setHours(0, 0, 0, 0);
          const daysUntil = Math.ceil((lettingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          return {
            id: bid.id,
            project_name: bid.project_name,
            letting_date: bid.letting_date,
            status: bid.status,
            incomplete_count: incompleteCount,
            total_items: totalItems,
            days_until: daysUntil,
          };
        })
        // Filter to only show bids that need attention (incomplete items OR due soon)
        .filter((bid: BidWithAttention) => bid.incomplete_count > 0 || bid.days_until <= 3);

      setBids(processedBids);
    } catch (err) {
      console.error('Error fetching bids needing attention:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bids');
    } finally {
      setIsLoading(false);
    }
  }, [profile?.organization_id]);

  useEffect(() => {
    fetchBidsNeedingAttention();
    // Refresh every 5 minutes
    const interval = setInterval(fetchBidsNeedingAttention, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchBidsNeedingAttention]);

  const getUrgencyClass = (daysUntil: number) => {
    if (daysUntil <= 0) return 'urgency-critical';
    if (daysUntil <= 1) return 'urgency-urgent';
    if (daysUntil <= 3) return 'urgency-high';
    if (daysUntil <= 7) return 'urgency-medium';
    return 'urgency-low';
  };

  const getUrgencyLabel = (daysUntil: number) => {
    if (daysUntil <= 0) return 'Due Today';
    if (daysUntil === 1) return 'Due Tomorrow';
    return `${daysUntil} days`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCompletionPercentage = (incomplete: number, total: number) => {
    if (total === 0) return 100;
    return Math.round(((total - incomplete) / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="bids-attention-widget">
        <div className="widget-header">
          <AlertTriangle size={20} />
          <h3>Bids Needing Attention</h3>
        </div>
        <div className="widget-loading">
          <Loader2 size={24} className="spinner" />
          <span>Loading bids...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bids-attention-widget">
        <div className="widget-header">
          <AlertTriangle size={20} />
          <h3>Bids Needing Attention</h3>
        </div>
        <div className="widget-error">
          <XCircle size={20} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="bids-attention-widget">
        <div className="widget-header">
          <AlertTriangle size={20} />
          <h3>Bids Needing Attention</h3>
        </div>
        <div className="widget-empty">
          <CheckCircle2 size={32} />
          <p>All caught up!</p>
          <span>No bids need immediate attention</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bids-attention-widget">
      <div className="widget-header">
        <div className="widget-title">
          <AlertTriangle size={20} />
          <h3>Bids Needing Attention</h3>
        </div>
        <Link to="/bids" className="widget-link">
          View all <ChevronRight size={14} />
        </Link>
      </div>

      <div className="bids-attention-list">
        {bids.map((bid) => {
          const completionPct = getCompletionPercentage(bid.incomplete_count, bid.total_items);
          const urgencyClass = getUrgencyClass(bid.days_until);

          return (
            <Link
              key={bid.id}
              to={`/bids/${bid.id}?tab=line-items`}
              className={`bid-attention-item ${urgencyClass}`}
            >
              <div className="bid-attention-icon">
                <FileText size={18} />
              </div>

              <div className="bid-attention-content">
                <div className="bid-attention-name">{bid.project_name}</div>
                <div className="bid-attention-meta">
                  <span className="bid-attention-date">
                    <Calendar size={12} />
                    {formatDate(bid.letting_date)}
                  </span>
                  {bid.total_items > 0 && (
                    <span className="bid-attention-items">
                      {bid.incomplete_count} of {bid.total_items} items need pricing
                    </span>
                  )}
                </div>

                {bid.total_items > 0 && (
                  <div className="bid-attention-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${completionPct}%` }}
                      />
                    </div>
                    <span className="progress-label">{completionPct}%</span>
                  </div>
                )}
              </div>

              <div className={`bid-attention-urgency ${urgencyClass}`}>
                <Clock size={14} />
                <span>{getUrgencyLabel(bid.days_until)}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {bids.length > 0 && (
        <div className="widget-footer">
          <span className="footer-summary">
            {bids.length} bid{bids.length !== 1 ? 's' : ''} need{bids.length === 1 ? 's' : ''} attention
          </span>
        </div>
      )}
    </div>
  );
}
