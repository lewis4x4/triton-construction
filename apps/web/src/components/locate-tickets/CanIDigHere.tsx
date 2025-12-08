import { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertOctagon,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  ChevronDown,
  ChevronUp,
  Eye,
  Flag,
} from 'lucide-react';
import { offlineStorage, OfflineTicket, OfflineUtility } from '../../services/offlineStorage';
import { supabase } from '@triton/supabase-client';
import './CanIDigHere.css';

interface CanIDigHereProps {
  projectId?: string;
  onTicketSelect?: (ticketId: string) => void;
}

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

type DiggingStatus = 'CHECKING' | 'CLEAR' | 'CAUTION' | 'WARNING' | 'STOP' | 'NO_TICKET' | 'ERROR';

interface DigCheckResult {
  status: DiggingStatus;
  message: string;
  details: string[];
  ticket: OfflineTicket | null;
  utilities: OfflineUtility[];
  isOffline: boolean;
  dataAge: string | null;
}

export function CanIDigHere({ projectId, onTicketSelect }: CanIDigHereProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [location, setLocation] = useState<GPSLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<DigCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showUtilities, setShowUtilities] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    lastSync: string | null;
    ticketCount: number;
    isExpired: boolean;
  } | null>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load sync status on mount
  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const stats = await offlineStorage.getOfflineStats();
      setSyncStatus({
        lastSync: stats.lastSyncAt,
        ticketCount: stats.totalTickets,
        isExpired: stats.isExpired,
      });
    } catch (err) {
      console.error('Error loading sync status:', err);
    }
  };

  const getLocation = useCallback(() => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsLocating(false);
      },
      (err) => {
        setLocationError(`Unable to get location: ${err.message}`);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000, // Allow 1 minute cache
      }
    );
  }, []);

  // Get location on mount
  useEffect(() => {
    getLocation();
  }, [getLocation]);

  const syncData = async () => {
    if (!isOnline) return;

    setIsSyncing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('wv811-offline-sync', {
        body: { userId: userData.user.id, projectIds: projectId ? [projectId] : [] },
      });

      if (response.error) throw response.error;

      await offlineStorage.saveOfflineData(response.data);
      await loadSyncStatus();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const checkCanDig = async () => {
    if (!location) {
      setCheckResult({
        status: 'ERROR',
        message: 'Location Required',
        details: ['Please enable GPS to check if you can dig at this location.'],
        ticket: null,
        utilities: [],
        isOffline: !isOnline,
        dataAge: null,
      });
      return;
    }

    setIsChecking(true);
    setCheckResult(null);

    try {
      // Try offline data first
      const nearbyTickets = await offlineStorage.findNearestTickets(
        location.latitude,
        location.longitude,
        500 // 500 meter radius
      );

      const meta = await offlineStorage.getSyncMeta();
      const dataAge = meta ? getTimeAgo(new Date(meta.lastSyncAt)) : null;
      const isDataExpired = meta ? new Date(meta.expiresAt) < new Date() : true;

      if (nearbyTickets.length === 0) {
        // No tickets found nearby
        setCheckResult({
          status: 'NO_TICKET',
          message: 'No Active Ticket Found',
          details: [
            'No locate ticket covers this location.',
            'You must have a valid 811 ticket before excavating.',
            `Searched within 500m of your location.`,
          ],
          ticket: null,
          utilities: [],
          isOffline: !isOnline,
          dataAge,
        });
        setIsChecking(false);
        return;
      }

      // Use the closest ticket
      const ticket = nearbyTickets[0];
      if (!ticket) {
        setCheckResult({
          status: 'NO_TICKET',
          message: 'No Active Ticket Found',
          details: ['No locate ticket covers this location.'],
          ticket: null,
          utilities: [],
          isOffline: !isOnline,
          dataAge,
        });
        setIsChecking(false);
        return;
      }
      const utilities = await offlineStorage.getUtilitiesForTicket(ticket.id);

      // Map risk level to status
      let status: DiggingStatus = 'CLEAR';
      switch (ticket.riskLevel) {
        case 'CLEAR':
          status = 'CLEAR';
          break;
        case 'CAUTION':
          status = 'CAUTION';
          break;
        case 'WARNING':
          status = 'WARNING';
          break;
        case 'STOP':
          status = 'STOP';
          break;
      }

      const details: string[] = [ticket.canDigReason];

      if (ticket.distance > 0) {
        details.push(`Ticket is ${Math.round(ticket.distance)}m from your location.`);
      }

      if (isDataExpired) {
        details.push('⚠️ Offline data is stale. Sync when online for latest status.');
      }

      const expiresAt = new Date(ticket.expiresAt);
      const hoursUntilExpiry = Math.round((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));
      if (hoursUntilExpiry < 24 && hoursUntilExpiry > 0) {
        details.push(`⏰ Ticket expires in ${hoursUntilExpiry} hours.`);
      }

      setCheckResult({
        status,
        message: getStatusMessage(status),
        details,
        ticket,
        utilities,
        isOffline: !isOnline,
        dataAge,
      });
    } catch (err) {
      console.error('Check error:', err);
      setCheckResult({
        status: 'ERROR',
        message: 'Check Failed',
        details: ['Unable to check dig status. Please try again.'],
        ticket: null,
        utilities: [],
        isOffline: !isOnline,
        dataAge: null,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusMessage = (status: DiggingStatus): string => {
    switch (status) {
      case 'CLEAR':
        return 'All Clear - Safe to Dig';
      case 'CAUTION':
        return 'Proceed with Caution';
      case 'WARNING':
        return 'Wait - Utilities Pending';
      case 'STOP':
        return 'DO NOT DIG';
      case 'NO_TICKET':
        return 'No Ticket Found';
      default:
        return 'Unknown Status';
    }
  };

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getUtilityStatusIcon = (status: string) => {
    switch (status) {
      case 'CLEAR':
      case 'MARKED':
      case 'NO_CONFLICT':
      case 'NOT_APPLICABLE':
      case 'VERIFIED_ON_SITE':
        return <CheckCircle size={16} className="utility-icon clear" />;
      case 'PENDING':
        return <Clock size={16} className="utility-icon pending" />;
      case 'UNVERIFIED':
        return <AlertTriangle size={16} className="utility-icon caution" />;
      case 'CONFLICT':
        return <XCircle size={16} className="utility-icon conflict" />;
      default:
        return <AlertTriangle size={16} className="utility-icon" />;
    }
  };

  return (
    <div className="can-i-dig-container">
      {/* Header with connection status */}
      <div className="dig-header">
        <h2>
          <MapPin size={24} />
          Can I Dig Here?
        </h2>
        <div className="connection-status">
          {isOnline ? (
            <span className="online">
              <Wifi size={16} /> Online
            </span>
          ) : (
            <span className="offline">
              <WifiOff size={16} /> Offline
            </span>
          )}
        </div>
      </div>

      {/* Sync Status */}
      <div className="sync-status">
        <div className="sync-info">
          <Clock size={14} />
          <span>
            {syncStatus?.lastSync
              ? `Data from ${getTimeAgo(new Date(syncStatus.lastSync))}`
              : 'No offline data'}
          </span>
          {syncStatus?.isExpired && <span className="expired-badge">Stale</span>}
        </div>
        <button
          className="sync-btn"
          onClick={syncData}
          disabled={!isOnline || isSyncing}
          title={isOnline ? 'Sync latest data' : 'Go online to sync'}
        >
          <RefreshCw size={16} className={isSyncing ? 'spin' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {/* Location Status */}
      <div className="location-status">
        <MapPin size={18} />
        {isLocating ? (
          <span className="locating">
            <Loader2 size={16} className="spin" /> Getting your location...
          </span>
        ) : location ? (
          <span className="located">
            <CheckCircle size={16} /> Location: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            <span className="accuracy">(±{Math.round(location.accuracy)}m)</span>
          </span>
        ) : (
          <span className="error">
            <XCircle size={16} /> {locationError || 'Location unavailable'}
            <button onClick={getLocation} className="retry-btn">
              Retry
            </button>
          </span>
        )}
      </div>

      {/* Check Button */}
      <button
        className="check-btn"
        onClick={checkCanDig}
        disabled={isChecking || !location}
      >
        {isChecking ? (
          <>
            <Loader2 size={24} className="spin" />
            Checking...
          </>
        ) : (
          <>
            <Eye size={24} />
            Check Now
          </>
        )}
      </button>

      {/* Result Display */}
      {checkResult && (
        <div className={`dig-result ${checkResult.status.toLowerCase()}`}>
          <div className="result-icon">
            {checkResult.status === 'CLEAR' && <CheckCircle size={48} />}
            {checkResult.status === 'CAUTION' && <AlertTriangle size={48} />}
            {checkResult.status === 'WARNING' && <AlertTriangle size={48} />}
            {checkResult.status === 'STOP' && <AlertOctagon size={48} />}
            {checkResult.status === 'NO_TICKET' && <XCircle size={48} />}
            {checkResult.status === 'ERROR' && <XCircle size={48} />}
          </div>

          <h3 className="result-message">{checkResult.message}</h3>

          <ul className="result-details">
            {checkResult.details.map((detail, i) => (
              <li key={i}>{detail}</li>
            ))}
          </ul>

          {checkResult.ticket && (
            <div className="ticket-summary">
              <div className="ticket-number">
                Ticket #{checkResult.ticket.ticketNumber}
              </div>
              <div className="ticket-address">
                {checkResult.ticket.digSiteAddress}, {checkResult.ticket.digSiteCity}
              </div>
              <div className="ticket-dates">
                <span>Valid: {new Date(checkResult.ticket.legalDigDate).toLocaleDateString()}</span>
                <span>Expires: {new Date(checkResult.ticket.expiresAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {/* Utilities Section */}
          {checkResult.utilities.length > 0 && (
            <div className="utilities-section">
              <button
                className="utilities-toggle"
                onClick={() => setShowUtilities(!showUtilities)}
              >
                <span>
                  <Flag size={16} />
                  {checkResult.utilities.length} Utilities
                </span>
                {showUtilities ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {showUtilities && (
                <div className="utilities-list">
                  {checkResult.utilities.map((util) => (
                    <div key={util.id} className={`utility-item ${util.responseStatus.toLowerCase()}`}>
                      <div className="utility-info">
                        {getUtilityStatusIcon(util.responseStatus)}
                        <span className="utility-name">{util.utilityName}</span>
                        <span className="utility-code">{util.utilityCode}</span>
                      </div>
                      <div className="utility-status">
                        {util.responseStatus.replace(/_/g, ' ')}
                        {util.verifiedOnSite && (
                          <span className="verified-badge">
                            <CheckCircle size={12} /> Verified
                          </span>
                        )}
                      </div>
                      {util.hasConflict && util.conflictReason && (
                        <div className="conflict-reason">
                          <AlertTriangle size={12} /> {util.conflictReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View Full Ticket Button */}
          {checkResult.ticket && onTicketSelect && (
            <button
              className="view-ticket-btn"
              onClick={() => onTicketSelect(checkResult.ticket!.id)}
            >
              View Full Ticket
            </button>
          )}

          {/* Offline Indicator */}
          {checkResult.isOffline && (
            <div className="offline-notice">
              <WifiOff size={14} />
              <span>Checked using offline data{checkResult.dataAge && ` (${checkResult.dataAge})`}</span>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="dig-disclaimer">
        <AlertTriangle size={14} />
        <span>
          Always verify marks on site before excavating. This tool provides guidance based on
          available data but does not replace physical verification.
        </span>
      </div>
    </div>
  );
}
