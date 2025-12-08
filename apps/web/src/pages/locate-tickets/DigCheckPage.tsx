import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Clock,
  Loader2,
  Shield,
  FileText,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './DigCheckPage.css';

interface DigCheckResult {
  result: 'PASS' | 'FAIL' | 'WARNING';
  result_message: string;
  ticket_id: string | null;
  ticket_number: string | null;
  issues: string[];
}

export function DigCheckPage() {
  const [location, setLocation] = useState('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkTime, setCheckTime] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<DigCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = useCallback(async () => {
    if (!location.trim()) {
      setError('Please enter a location or ticket number');
      return;
    }

    setIsChecking(true);
    setError(null);
    setResult(null);

    try {
      // Get user's organization
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.organization_id) throw new Error('No organization found');

      // Call the check_dig_status function
      const { data, error: fnError } = await supabase.rpc('check_dig_status', {
        p_organization_id: profile.organization_id,
        p_location: location.trim(),
        p_check_date: checkDate || new Date().toISOString().split('T')[0] || '',
        p_check_time: checkTime ?? undefined,
      });

      if (fnError) throw fnError;

      if (data && data.length > 0) {
        const checkResult = data[0];
        if (checkResult) {
          setResult({
            result: checkResult.result as 'PASS' | 'FAIL' | 'WARNING',
            result_message: checkResult.result_message,
            ticket_id: checkResult.ticket_id,
            ticket_number: checkResult.ticket_number,
            issues: Array.isArray(checkResult.issues) ? (checkResult.issues as string[]) : [],
          });

          // Log the check for audit
          await supabase.from('wv811_dig_checks').insert({
            organization_id: profile.organization_id,
            location_query: location.trim(),
            check_date: checkDate || new Date().toISOString().split('T')[0] || '',
            check_time: checkTime || null,
            result: String(checkResult.result),
            result_message: String(checkResult.result_message),
            ticket_id: checkResult.ticket_id as string | null,
            issues: checkResult.issues,
            checked_by: userData.user.id,
          });
        }
      } else {
        setResult({
          result: 'FAIL',
          result_message: 'No matching ticket found for this location.',
          ticket_id: null,
          ticket_number: null,
          issues: ['No matching ticket found'],
        });
      }
    } catch (err) {
      console.error('Check error:', err);
      setError(err instanceof Error ? err.message : 'Failed to check dig status');
    } finally {
      setIsChecking(false);
    }
  }, [location, checkDate, checkTime]);

  const getResultIcon = () => {
    if (!result) return null;
    switch (result.result) {
      case 'PASS':
        return <CheckCircle size={64} className="result-icon pass" />;
      case 'WARNING':
        return <AlertTriangle size={64} className="result-icon warning" />;
      case 'FAIL':
        return <XCircle size={64} className="result-icon fail" />;
    }
  };

  const getResultClass = () => {
    if (!result) return '';
    return `result-${result.result.toLowerCase()}`;
  };

  return (
    <div className="dig-check-page">
      <div className="dig-check-header">
        <Link to="/locate-tickets" className="back-link">
          <ArrowLeft size={18} />
          Back to Tickets
        </Link>
        <div className="header-content">
          <div className="header-title">
            <Shield size={32} strokeWidth={1.5} />
            <h1>Can I Dig Here Today?</h1>
          </div>
          <p className="header-subtitle">
            Quick safety check before excavation - verify your ticket status
          </p>
        </div>
      </div>

      <div className="dig-check-content">
        <div className="check-form-card">
          <h2>Enter Location Details</h2>

          <div className="form-group">
            <label htmlFor="location">
              <MapPin size={16} />
              Location or Ticket Number
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., 123 Main St, Cross Lanes or ticket #2533523426"
              autoFocus
            />
            <span className="form-hint">
              Enter a street address, intersection, or WV811 ticket number
            </span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="checkDate">
                <Calendar size={16} />
                Date
              </label>
              <input
                id="checkDate"
                type="date"
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="checkTime">
                <Clock size={16} />
                Time (Optional)
              </label>
              <input
                id="checkTime"
                type="time"
                value={checkTime}
                onChange={(e) => setCheckTime(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="check-error">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          <button
            className="check-button"
            onClick={handleCheck}
            disabled={isChecking || !location.trim()}
          >
            {isChecking ? (
              <>
                <Loader2 size={20} className="spinner" />
                Checking...
              </>
            ) : (
              <>
                <Search size={20} />
                Check Dig Status
              </>
            )}
          </button>
        </div>

        {result && (
          <div className={`result-card ${getResultClass()}`}>
            <div className="result-header">
              {getResultIcon()}
              <div className="result-status">
                <span className="result-label">
                  {result.result === 'PASS' && 'SAFE TO DIG'}
                  {result.result === 'WARNING' && 'CAUTION'}
                  {result.result === 'FAIL' && 'DO NOT DIG'}
                </span>
              </div>
            </div>

            <div className="result-message">{result.result_message}</div>

            {result.ticket_number && (
              <div className="result-ticket">
                <FileText size={16} />
                <span>Ticket #{result.ticket_number}</span>
                {result.ticket_id && (
                  <Link to={`/locate-tickets/${result.ticket_id}`} className="view-ticket-link">
                    View Details →
                  </Link>
                )}
              </div>
            )}

            {result.issues && result.issues.length > 0 && (
              <div className="result-issues">
                <h4>Issues Found:</h4>
                <ul>
                  {result.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="result-actions">
              {result.result === 'FAIL' && (
                <Link to="/locate-tickets" className="btn btn-primary">
                  Request New Ticket
                </Link>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setResult(null);
                  setLocation('');
                }}
              >
                Check Another Location
              </button>
            </div>
          </div>
        )}

        <div className="check-info">
          <h3>How This Works</h3>
          <div className="info-grid">
            <div className="info-item">
              <CheckCircle size={24} className="pass" />
              <div>
                <strong>PASS</strong>
                <p>Valid ticket covering the date. All utilities have responded with Clear.</p>
              </div>
            </div>
            <div className="info-item">
              <AlertTriangle size={24} className="warning" />
              <div>
                <strong>WARNING</strong>
                <p>Ticket exists but some utilities pending, or Update By deadline approaching.</p>
              </div>
            </div>
            <div className="info-item">
              <XCircle size={24} className="fail" />
              <div>
                <strong>FAIL</strong>
                <p>No valid ticket, expired ticket, or utility conflict reported. Do not excavate.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
