import { useState, useEffect } from 'react';
import {
  Users,
  MapPin,
  AlertTriangle,
  Phone,
  MessageSquare,
  ChevronRight,
  X,
  Send,
  Bell,
  Loader2,
  Eye,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './MultiCrewCoordination.css';

interface CrewLocation {
  id: string;
  crewLeadName: string;
  crewLeadPhone?: string;
  projectName: string;
  ticketNumber: string;
  ticketId: string;
  location: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  lastUpdated: string;
  crewSize: number;
  status: 'ACTIVE' | 'BREAK' | 'COMPLETE';
}

interface ConflictAlert {
  id: string;
  type: 'OVERLAP' | 'NEARBY' | 'SAME_TICKET';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  crews: string[];
  ticketNumbers: string[];
  createdAt: string;
  acknowledged: boolean;
}

interface MultiCrewCoordinationProps {
  ticketId?: string;
  projectId?: string;
  currentLocation?: { latitude: number; longitude: number };
  onViewTicket?: (ticketId: string) => void;
}

export function MultiCrewCoordination({
  ticketId,
  projectId,
  currentLocation,
  onViewTicket,
}: MultiCrewCoordinationProps) {
  const [nearbyCrews, setNearbyCrews] = useState<CrewLocation[]>([]);
  const [conflictAlerts, setConflictAlerts] = useState<ConflictAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<CrewLocation | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadNearbyCrews();
    // Set up real-time subscription for crew movements
    const subscription = subscribeToCrewUpdates();
    return () => {
      subscription?.unsubscribe();
    };
  }, [ticketId, projectId, currentLocation]);

  const loadNearbyCrews = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();

      if (!userProfile) return;

      // Get active time entries (crews currently on the clock)
      const today = new Date().toISOString().split('T')[0];
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select(`
          id,
          project_id,
          crew_member_id,
          clock_in_location,
          projects:project_id (name, project_number),
          crew_members:crew_member_id (display_name, phone_number)
        `)
        .eq('work_date', today)
        .is('clock_out_time', null);

      // Get tickets for their projects
      const projectIds = [...new Set(timeEntries?.map((te) => te.project_id) || [])];

      const { data: projectTickets } = await supabase
        .from('wv811_project_tickets')
        .select(`
          project_id,
          ticket_id,
          wv811_tickets:ticket_id (id, ticket_number, dig_site_latitude, dig_site_longitude)
        `)
        .in('project_id', projectIds);

      // Build crew locations
      const crews: CrewLocation[] = [];
      const crewsByProject = new Map<string, number>();

      timeEntries?.forEach((entry) => {
        const projectId = entry.project_id;
        crewsByProject.set(projectId, (crewsByProject.get(projectId) || 0) + 1);
      });

      // Group by project and get crew leads
      const processedProjects = new Set<string>();
      timeEntries?.forEach((entry) => {
        if (processedProjects.has(entry.project_id)) return;
        processedProjects.add(entry.project_id);

        const projectTicket = projectTickets?.find((pt) => pt.project_id === entry.project_id);
        if (!projectTicket?.wv811_tickets) return;

        const ticket = projectTicket.wv811_tickets as {
          id: string;
          ticket_number: string;
          dig_site_latitude: number;
          dig_site_longitude: number;
        };

        if (!ticket.dig_site_latitude || !ticket.dig_site_longitude) return;

        const crew: CrewLocation = {
          id: entry.id,
          crewLeadName: (entry.crew_members as { display_name: string })?.display_name || 'Unknown',
          crewLeadPhone: (entry.crew_members as { phone_number?: string })?.phone_number,
          projectName: (entry.projects as { name: string })?.name || 'Unknown Project',
          ticketNumber: ticket.ticket_number,
          ticketId: ticket.id,
          location: {
            latitude: ticket.dig_site_latitude,
            longitude: ticket.dig_site_longitude,
          },
          lastUpdated: new Date().toISOString(),
          crewSize: crewsByProject.get(entry.project_id) || 1,
          status: 'ACTIVE',
        };

        // Calculate distance if we have current location
        if (currentLocation) {
          crew.distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            crew.location.latitude,
            crew.location.longitude
          );
        }

        crews.push(crew);
      });

      // Sort by distance if available
      if (currentLocation) {
        crews.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      setNearbyCrews(crews);

      // Generate conflict alerts
      const alerts = generateConflictAlerts(crews);
      setConflictAlerts(alerts);

    } catch (err) {
      console.error('Error loading crews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToCrewUpdates = () => {
    // Real-time subscription for crew location updates
    const subscription = supabase
      .channel('crew-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, () => {
        loadNearbyCrews();
      })
      .subscribe();

    return subscription;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const generateConflictAlerts = (crews: CrewLocation[]): ConflictAlert[] => {
    const alerts: ConflictAlert[] = [];

    // Check for crews on the same ticket
    const ticketGroups = new Map<string, CrewLocation[]>();
    crews.forEach((crew) => {
      const existing = ticketGroups.get(crew.ticketNumber) || [];
      existing.push(crew);
      ticketGroups.set(crew.ticketNumber, existing);
    });

    ticketGroups.forEach((crewsOnTicket, ticketNumber) => {
      if (crewsOnTicket.length > 1) {
        alerts.push({
          id: `same-${ticketNumber}`,
          type: 'SAME_TICKET',
          severity: 'WARNING',
          message: `${crewsOnTicket.length} crews working on ticket #${ticketNumber}`,
          crews: crewsOnTicket.map((c) => c.crewLeadName),
          ticketNumbers: [ticketNumber],
          createdAt: new Date().toISOString(),
          acknowledged: false,
        });
      }
    });

    // Check for crews within 100m of each other on different tickets
    for (let i = 0; i < crews.length; i++) {
      for (let j = i + 1; j < crews.length; j++) {
        if (crews[i].ticketNumber === crews[j].ticketNumber) continue;

        const distance = calculateDistance(
          crews[i].location.latitude,
          crews[i].location.longitude,
          crews[j].location.latitude,
          crews[j].location.longitude
        );

        if (distance < 100) {
          alerts.push({
            id: `nearby-${crews[i].id}-${crews[j].id}`,
            type: 'NEARBY',
            severity: 'INFO',
            message: `Crews within ${Math.round(distance)}m of each other`,
            crews: [crews[i].crewLeadName, crews[j].crewLeadName],
            ticketNumbers: [crews[i].ticketNumber, crews[j].ticketNumber],
            createdAt: new Date().toISOString(),
            acknowledged: false,
          });
        }
      }
    }

    return alerts;
  };

  const handleSendMessage = async () => {
    if (!selectedCrew || !message.trim()) return;

    setIsSending(true);
    try {
      // In a real implementation, this would send an SMS or push notification
      await supabase.from('wv811_crew_messages').insert({
        from_user_id: (await supabase.auth.getUser()).data.user?.id,
        to_phone: selectedCrew.crewLeadPhone,
        message: message,
        ticket_id: selectedCrew.ticketId,
        sent_at: new Date().toISOString(),
      });

      setShowMessageModal(false);
      setMessage('');
      setSelectedCrew(null);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const formatDistance = (meters?: number): string => {
    if (!meters) return 'Unknown';
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="multi-crew-container">
      {/* Header */}
      <div className="crew-header">
        <div className="header-title">
          <Users size={20} />
          <h3>Nearby Crews</h3>
        </div>
        <span className="crew-count">{nearbyCrews.length} active</span>
      </div>

      {/* Conflict Alerts */}
      {conflictAlerts.length > 0 && (
        <div className="conflict-alerts">
          {conflictAlerts.map((alert) => (
            <div key={alert.id} className={`conflict-alert ${alert.severity.toLowerCase()}`}>
              <div className="alert-icon">
                {alert.severity === 'CRITICAL' ? (
                  <AlertTriangle size={18} />
                ) : alert.severity === 'WARNING' ? (
                  <Bell size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </div>
              <div className="alert-content">
                <span className="alert-message">{alert.message}</span>
                <span className="alert-crews">{alert.crews.join(', ')}</span>
              </div>
              <button className="alert-dismiss">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Crew List */}
      {isLoading ? (
        <div className="loading-state">
          <Loader2 size={24} className="spin" />
          <span>Finding nearby crews...</span>
        </div>
      ) : nearbyCrews.length === 0 ? (
        <div className="empty-state">
          <Users size={32} />
          <p>No other crews nearby</p>
          <span>You're the only crew in this area</span>
        </div>
      ) : (
        <div className="crew-list">
          {nearbyCrews.map((crew) => (
            <div key={crew.id} className="crew-card">
              <div className="crew-info">
                <div className="crew-main">
                  <span className="crew-lead">{crew.crewLeadName}</span>
                  <span className={`crew-status ${crew.status.toLowerCase()}`}>
                    {crew.status}
                  </span>
                </div>
                <div className="crew-details">
                  <span className="crew-project">{crew.projectName}</span>
                  <span className="crew-size">
                    <Users size={12} /> {crew.crewSize}
                  </span>
                </div>
                <div className="crew-ticket">
                  <MapPin size={12} />
                  <span>Ticket #{crew.ticketNumber}</span>
                  {crew.distance !== undefined && (
                    <span className="crew-distance">{formatDistance(crew.distance)} away</span>
                  )}
                </div>
              </div>

              <div className="crew-actions">
                {crew.crewLeadPhone && (
                  <a href={`tel:${crew.crewLeadPhone}`} className="action-btn call">
                    <Phone size={16} />
                  </a>
                )}
                <button
                  className="action-btn message"
                  onClick={() => {
                    setSelectedCrew(crew);
                    setShowMessageModal(true);
                  }}
                >
                  <MessageSquare size={16} />
                </button>
                {onViewTicket && (
                  <button
                    className="action-btn view"
                    onClick={() => onViewTicket(crew.ticketId)}
                  >
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Coordination Tips */}
      <div className="coordination-tips">
        <h4>Coordination Tips</h4>
        <ul>
          <li>Contact nearby crews before crossing into their work area</li>
          <li>Verify ticket boundaries don't overlap</li>
          <li>Report any unmarked utilities to all nearby crews</li>
        </ul>
      </div>

      {/* Message Modal */}
      {showMessageModal && selectedCrew && (
        <div className="message-modal-overlay">
          <div className="message-modal">
            <div className="modal-header">
              <h3>Message {selectedCrew.crewLeadName}</h3>
              <button className="modal-close" onClick={() => setShowMessageModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-content">
              <div className="recipient-info">
                <Users size={16} />
                <span>{selectedCrew.projectName}</span>
                <span className="separator">•</span>
                <span>Ticket #{selectedCrew.ticketNumber}</span>
              </div>

              <div className="quick-messages">
                <button onClick={() => setMessage('Heads up - working nearby on same ticket')}>
                  Working nearby
                </button>
                <button onClick={() => setMessage('Found unmarked utility - please verify before digging')}>
                  Unmarked utility
                </button>
                <button onClick={() => setMessage('Need to coordinate on shared work area')}>
                  Coordinate work area
                </button>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowMessageModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 size={16} className="spin" /> Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for sidebar/widget use
export function NearbyCrewsWidget({ onExpand }: { onExpand?: () => void }) {
  const [count, setCount] = useState(0);
  const [hasAlerts, setHasAlerts] = useState(false);

  useEffect(() => {
    // Quick check for nearby crews
    const checkCrews = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('time_entries')
        .select('*', { count: 'exact', head: true })
        .eq('work_date', today)
        .is('clock_out_time', null);

      setCount(count || 0);
    };

    checkCrews();
  }, []);

  if (count === 0) return null;

  return (
    <button className="nearby-crews-widget" onClick={onExpand}>
      <Users size={18} />
      <span>{count} crews nearby</span>
      {hasAlerts && <span className="alert-dot" />}
      <ChevronRight size={16} />
    </button>
  );
}
