import { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  MapPin,
  Car,
  AlertTriangle,
  Clock,
  Route,
  Construction,
  Users,
  Bike,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import 'mapbox-gl/dist/mapbox-gl.css';
import './BidTrafficMap.css';

// Get Mapbox token from environment
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibGV3aXM0eDQiLCJhIjoiY21pZGp5aGJkMDczNTJpcHQ3ZmFiNDEwbiJ9.MfYe1QhQxfwGAFltutpADw';
mapboxgl.accessToken = MAPBOX_TOKEN;

// Map styles
const MAP_STYLES = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
} as const;

type MapStyle = keyof typeof MAP_STYLES;

// LOS colors for visual indicators
const LOS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: '#22c55e', text: '#fff', label: 'Free Flow' },
  B: { bg: '#84cc16', text: '#fff', label: 'Stable Flow' },
  C: { bg: '#eab308', text: '#000', label: 'Stable Flow' },
  D: { bg: '#f97316', text: '#fff', label: 'Approaching Unstable' },
  E: { bg: '#ef4444', text: '#fff', label: 'Unstable Flow' },
  F: { bg: '#dc2626', text: '#fff', label: 'Forced Flow' },
};

// Traffic study extraction data structure
interface TrafficStudyData {
  summary?: string;
  document_category?: string;
  key_findings?: Array<{
    type: string;
    title: string;
    description: string;
    severity: string;
    page_reference?: string;
  }>;
  extracted_data?: {
    aadt?: number;
    adt?: number;
    peak_hour_am_volume?: number;
    peak_hour_pm_volume?: number;
    peak_hour_am_time?: string;
    peak_hour_pm_time?: string;
    current_los?: string;
    projected_los_during_construction?: string;
    truck_percentage?: number;
    speed_limit_existing?: number;
    speed_limit_work_zone?: number;
    road_closure_allowed?: boolean;
    full_closure_hours?: string;
    lane_closure_restrictions?: string[];
    detour_required?: boolean;
    detour_routes?: Array<{
      description: string;
      length_miles?: number;
      added_travel_time_minutes?: number;
    }>;
    crash_history?: {
      period_years?: number;
      total_crashes?: number;
      fatal_crashes?: number;
      injury_crashes?: number;
      crash_rate?: number;
    };
    work_zone_requirements?: {
      flaggers_required?: boolean;
      pilot_car_required?: boolean;
      temporary_signals_required?: boolean;
      night_work_required?: boolean;
      night_work_reason?: string;
      police_officer_required?: boolean;
      rumble_strips_required?: boolean;
      portable_changeable_message_signs?: number;
    };
    timing_restrictions?: Array<{
      restriction: string;
      reason: string;
      dates_or_times: string;
    }>;
    pedestrian_accommodations_required?: boolean;
    bicycle_accommodations_required?: boolean;
    school_zone_impacts?: boolean;
    special_events_considerations?: string[];
    recommended_construction_phases?: string[];
    mot_plan_requirements?: string[];
  };
  confidence_score?: number;
}

interface BidTrafficMapProps {
  projectId: string;
  projectName: string;
  projectLocation?: {
    lat: number;
    lng: number;
  } | null;
  county?: string;
  route?: string;
}

export function BidTrafficMap({
  projectId,
  projectName,
  projectLocation,
  county,
  route: _route, // Reserved for future geocoding
}: BidTrafficMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const [trafficData, setTrafficData] = useState<TrafficStudyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTrafficStudy, setHasTrafficStudy] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyle>('streets');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    metrics: true,
    workZone: false,
    detours: false,
    safety: false,
  });

  // Fetch traffic study data
  useEffect(() => {
    async function fetchTrafficData() {
      setIsLoading(true);
      try {
        // Query for TRAFFIC_STUDY documents with AI analysis data
        // The extracted data is split across multiple columns per migration 096
        // Using explicit type cast since generated types may not include new columns
        const { data: documents, error } = await supabase
          .from('bid_documents')
          .select('id, file_name, document_type, ai_summary, ai_key_findings, ai_document_category, ai_confidence_score, ai_analysis_metadata, processing_status')
          .eq('bid_project_id', projectId)
          .eq('document_type', 'TRAFFIC_STUDY')
          .eq('processing_status', 'COMPLETED')
          .order('created_at', { ascending: false })
          .limit(1) as { data: Array<{
            id: string;
            file_name: string;
            document_type: string;
            ai_summary: string | null;
            ai_key_findings: unknown;
            ai_document_category: string | null;
            ai_confidence_score: number | null;
            ai_analysis_metadata: unknown;
            processing_status: string;
          }> | null; error: unknown };

        if (error) {
          console.error('Error fetching traffic data:', error);
          return;
        }

        const doc = documents?.[0];
        if (doc && doc.ai_summary) {
          // Reconstruct TrafficStudyData from the separate columns
          const trafficStudyData: TrafficStudyData = {
            summary: doc.ai_summary,
            document_category: doc.ai_document_category ?? undefined,
            key_findings: doc.ai_key_findings as TrafficStudyData['key_findings'],
            confidence_score: doc.ai_confidence_score ?? undefined,
            extracted_data: doc.ai_analysis_metadata as TrafficStudyData['extracted_data'],
          };
          setTrafficData(trafficStudyData);
          setHasTrafficStudy(true);
        }
      } catch (err) {
        console.error('Error fetching traffic study:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrafficData();
  }, [projectId]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    if (!projectLocation?.lat || !projectLocation?.lng) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[mapStyle],
      center: [projectLocation.lng, projectLocation.lat],
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add project marker
    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <div class="traffic-map-popup">
        <strong>${projectName}</strong>
        ${trafficData?.extracted_data?.aadt ? `<br/>AADT: ${trafficData.extracted_data.aadt.toLocaleString()} vpd` : ''}
        ${trafficData?.extracted_data?.current_los ? `<br/>LOS: ${trafficData.extracted_data.current_los}` : ''}
      </div>
    `);

    marker.current = new mapboxgl.Marker({ color: '#ef4444' })
      .setLngLat([projectLocation.lng, projectLocation.lat])
      .setPopup(popup)
      .addTo(map.current);

    return () => {
      marker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, [projectLocation, projectName]);

  // Update map style
  useEffect(() => {
    if (map.current) {
      map.current.setStyle(MAP_STYLES[mapStyle]);
    }
  }, [mapStyle]);

  // Update popup content when traffic data loads
  useEffect(() => {
    if (marker.current && trafficData?.extracted_data && projectLocation) {
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="traffic-map-popup">
          <strong>${projectName}</strong>
          ${trafficData.extracted_data.aadt ? `<br/>AADT: ${trafficData.extracted_data.aadt.toLocaleString()} vpd` : ''}
          ${trafficData.extracted_data.current_los ? `<br/>LOS: ${trafficData.extracted_data.current_los}` : ''}
        </div>
      `);
      marker.current.setPopup(popup);
    }
  }, [trafficData, projectName, projectLocation]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatNumber = (num: number | undefined | null) => {
    if (num == null) return '-';
    return num.toLocaleString();
  };

  const getDirectionsUrl = useCallback((detourDescription: string) => {
    // Create a Google Maps directions search URL
    const searchQuery = encodeURIComponent(`${detourDescription} ${county ? county + ' County' : ''} WV`);
    return `https://www.google.com/maps/search/${searchQuery}`;
  }, [county]);

  // Don't render if no location
  if (!projectLocation?.lat || !projectLocation?.lng) {
    return (
      <div className="traffic-map-section">
        <div className="section-header">
          <div className="section-title">
            <MapPin size={20} />
            <h3>Site Analysis</h3>
          </div>
        </div>
        <div className="no-location-message">
          <MapPin size={32} />
          <p>No project coordinates available.</p>
          <span>Add latitude/longitude to the project to enable map visualization.</span>
        </div>
      </div>
    );
  }

  const data = trafficData?.extracted_data;
  const currentLOS = data?.current_los;
  const constructionLOS = data?.projected_los_during_construction;

  return (
    <div className="traffic-map-section">
      <div className="section-header">
        <div className="section-title">
          <Car size={20} />
          <h3>Site Analysis — Traffic Data</h3>
          {hasTrafficStudy && (
            <span className="traffic-badge">Traffic Study Analyzed</span>
          )}
        </div>
        <div className="map-style-toggle">
          <button
            className={`style-btn ${mapStyle === 'streets' ? 'active' : ''}`}
            onClick={() => setMapStyle('streets')}
            title="Streets"
          >
            <Layers size={14} />
          </button>
          <button
            className={`style-btn ${mapStyle === 'satellite' ? 'active' : ''}`}
            onClick={() => setMapStyle('satellite')}
            title="Satellite"
          >
            🛰️
          </button>
          <button
            className={`style-btn ${mapStyle === 'light' ? 'active' : ''}`}
            onClick={() => setMapStyle('light')}
            title="Light"
          >
            ☀️
          </button>
        </div>
      </div>

      <div className="traffic-map-content">
        {/* Map Container */}
        <div className="map-wrapper">
          <div ref={mapContainer} className="traffic-map-container" />

          {/* AADT Overlay Badge */}
          {data?.aadt && (
            <div className="aadt-overlay">
              <span className="aadt-label">AADT</span>
              <span className="aadt-value">{formatNumber(data.aadt)}</span>
              <span className="aadt-unit">vpd</span>
            </div>
          )}

          {/* LOS Badge */}
          {currentLOS && (
            <div
              className="los-overlay"
              style={{ backgroundColor: LOS_COLORS[currentLOS]?.bg || '#666' }}
            >
              <span className="los-label">LOS</span>
              <span className="los-value">{currentLOS}</span>
            </div>
          )}
        </div>

        {/* Traffic Metrics Panel */}
        <div className="traffic-metrics-panel">
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner" />
              <span>Loading traffic data...</span>
            </div>
          ) : !hasTrafficStudy ? (
            <div className="no-data-state">
              <AlertTriangle size={24} />
              <p>No traffic study uploaded</p>
              <span>Upload a TRAFFIC_STUDY document to see analysis</span>
            </div>
          ) : (
            <>
              {/* Summary */}
              {trafficData?.summary && (
                <div className="traffic-summary">
                  <p>{trafficData.summary}</p>
                </div>
              )}

              {/* Traffic Metrics Section */}
              <div className="metrics-section">
                <button
                  className="section-toggle"
                  onClick={() => toggleSection('metrics')}
                >
                  <Car size={16} />
                  <span>Traffic Metrics</span>
                  {expandedSections.metrics ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {expandedSections.metrics && (
                  <div className="metrics-grid">
                    <div className="metric-item">
                      <label>AADT</label>
                      <span className="value">{formatNumber(data?.aadt)}</span>
                      <span className="unit">vpd</span>
                    </div>
                    <div className="metric-item">
                      <label>Peak AM</label>
                      <span className="value">{formatNumber(data?.peak_hour_am_volume)}</span>
                      <span className="unit">vph</span>
                      {data?.peak_hour_am_time && (
                        <span className="time">{data.peak_hour_am_time}</span>
                      )}
                    </div>
                    <div className="metric-item">
                      <label>Peak PM</label>
                      <span className="value">{formatNumber(data?.peak_hour_pm_volume)}</span>
                      <span className="unit">vph</span>
                      {data?.peak_hour_pm_time && (
                        <span className="time">{data.peak_hour_pm_time}</span>
                      )}
                    </div>
                    <div className="metric-item">
                      <label>Trucks</label>
                      <span className="value">{data?.truck_percentage ?? '-'}</span>
                      <span className="unit">%</span>
                    </div>
                    <div className="metric-item los-metric">
                      <label>Current LOS</label>
                      {currentLOS ? (
                        <span
                          className="los-badge"
                          style={{
                            backgroundColor: LOS_COLORS[currentLOS]?.bg,
                            color: LOS_COLORS[currentLOS]?.text,
                          }}
                        >
                          {currentLOS} — {LOS_COLORS[currentLOS]?.label}
                        </span>
                      ) : (
                        <span className="value">-</span>
                      )}
                    </div>
                    <div className="metric-item los-metric">
                      <label>Construction LOS</label>
                      {constructionLOS ? (
                        <span
                          className="los-badge"
                          style={{
                            backgroundColor: LOS_COLORS[constructionLOS]?.bg,
                            color: LOS_COLORS[constructionLOS]?.text,
                          }}
                        >
                          {constructionLOS} — {LOS_COLORS[constructionLOS]?.label}
                        </span>
                      ) : (
                        <span className="value">-</span>
                      )}
                    </div>
                    <div className="metric-item">
                      <label>Speed Limit</label>
                      <span className="value">{data?.speed_limit_existing ?? '-'}</span>
                      <span className="unit">mph</span>
                    </div>
                    <div className="metric-item">
                      <label>Work Zone Speed</label>
                      <span className="value">{data?.speed_limit_work_zone ?? '-'}</span>
                      <span className="unit">mph</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Work Zone Requirements */}
              {data?.work_zone_requirements && (
                <div className="metrics-section">
                  <button
                    className="section-toggle"
                    onClick={() => toggleSection('workZone')}
                  >
                    <Construction size={16} />
                    <span>Work Zone Requirements</span>
                    {expandedSections.workZone ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {expandedSections.workZone && (
                    <div className="requirements-list">
                      {data.work_zone_requirements.flaggers_required && (
                        <div className="requirement-item">✓ Flaggers Required</div>
                      )}
                      {data.work_zone_requirements.pilot_car_required && (
                        <div className="requirement-item">✓ Pilot Car Required</div>
                      )}
                      {data.work_zone_requirements.temporary_signals_required && (
                        <div className="requirement-item">✓ Temporary Signals Required</div>
                      )}
                      {data.work_zone_requirements.night_work_required && (
                        <div className="requirement-item warning">
                          ⚠️ Night Work Required
                          {data.work_zone_requirements.night_work_reason && (
                            <span className="reason"> — {data.work_zone_requirements.night_work_reason}</span>
                          )}
                        </div>
                      )}
                      {data.work_zone_requirements.police_officer_required && (
                        <div className="requirement-item">✓ Police Officer Required</div>
                      )}
                      {data.work_zone_requirements.portable_changeable_message_signs && (
                        <div className="requirement-item">
                          ✓ PCMS Signs: {data.work_zone_requirements.portable_changeable_message_signs}
                        </div>
                      )}
                      {data.road_closure_allowed !== undefined && (
                        <div className={`requirement-item ${data.road_closure_allowed ? '' : 'warning'}`}>
                          {data.road_closure_allowed ? '✓ Road Closure Allowed' : '⚠️ Road Closure NOT Allowed'}
                          {data.full_closure_hours && (
                            <span className="reason"> — {data.full_closure_hours}</span>
                          )}
                        </div>
                      )}
                      {data.lane_closure_restrictions && data.lane_closure_restrictions.length > 0 && (
                        <div className="restrictions-list">
                          <strong>Lane Closure Restrictions:</strong>
                          <ul>
                            {data.lane_closure_restrictions.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Detour Routes */}
              {data?.detour_required && data?.detour_routes && data.detour_routes.length > 0 && (
                <div className="metrics-section">
                  <button
                    className="section-toggle"
                    onClick={() => toggleSection('detours')}
                  >
                    <Route size={16} />
                    <span>Detour Routes ({data.detour_routes.length})</span>
                    {expandedSections.detours ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {expandedSections.detours && (
                    <div className="detours-list">
                      {data.detour_routes.map((detour, idx) => (
                        <div key={idx} className="detour-item">
                          <div className="detour-header">
                            <MapPin size={14} />
                            <span className="detour-name">
                              {idx === 0 ? 'Primary' : `Alternative ${idx}`}
                            </span>
                          </div>
                          <p className="detour-description">{detour.description}</p>
                          <div className="detour-meta">
                            {detour.length_miles && (
                              <span>
                                <Route size={12} />
                                {detour.length_miles} mi
                              </span>
                            )}
                            {detour.added_travel_time_minutes && (
                              <span>
                                <Clock size={12} />
                                +{detour.added_travel_time_minutes} min
                              </span>
                            )}
                            <a
                              href={getDirectionsUrl(detour.description)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="directions-link"
                            >
                              <ExternalLink size={12} />
                              Directions
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Safety & Accommodations */}
              {(data?.pedestrian_accommodations_required ||
                data?.bicycle_accommodations_required ||
                data?.school_zone_impacts ||
                data?.crash_history) && (
                <div className="metrics-section">
                  <button
                    className="section-toggle"
                    onClick={() => toggleSection('safety')}
                  >
                    <Users size={16} />
                    <span>Safety & Accommodations</span>
                    {expandedSections.safety ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {expandedSections.safety && (
                    <div className="safety-content">
                      <div className="accommodations-row">
                        {data.pedestrian_accommodations_required && (
                          <div className="accommodation-badge">
                            <Users size={14} />
                            Pedestrian Access Required
                          </div>
                        )}
                        {data.bicycle_accommodations_required && (
                          <div className="accommodation-badge">
                            <Bike size={14} />
                            Bicycle Access Required
                          </div>
                        )}
                        {data.school_zone_impacts && (
                          <div className="accommodation-badge warning">
                            <AlertTriangle size={14} />
                            School Zone Impacts
                          </div>
                        )}
                      </div>

                      {data.crash_history && (
                        <div className="crash-history">
                          <strong>Crash History ({data.crash_history.period_years || '?'} years)</strong>
                          <div className="crash-stats">
                            <span>Total: {data.crash_history.total_crashes ?? '-'}</span>
                            {data.crash_history.fatal_crashes !== undefined && data.crash_history.fatal_crashes > 0 && (
                              <span className="fatal">Fatal: {data.crash_history.fatal_crashes}</span>
                            )}
                            {data.crash_history.injury_crashes !== undefined && (
                              <span>Injury: {data.crash_history.injury_crashes}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Confidence Score */}
              {trafficData?.confidence_score !== undefined && (
                <div className="confidence-score">
                  <span>AI Confidence: {trafficData.confidence_score}%</span>
                  <div className="confidence-bar">
                    <div
                      className="confidence-fill"
                      style={{ width: `${trafficData.confidence_score}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
