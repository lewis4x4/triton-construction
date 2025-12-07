import { useState, useMemo } from 'react';
import {
  Truck,
  MapPin,
  Clock,
  Route,
  Factory,
  Mountain,
  Building2,
  Trash2,
  Phone,
  CheckCircle,
  AlertCircle,
  Filter,
  ArrowRight,
  Navigation,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Gauge,
} from 'lucide-react';
import { mockHaulResources, mockProject, type HaulResource } from '../../data/mockBidData';
import './HaulRouteMap.css';

type ResourceFilter = 'ALL' | HaulResource['type'];

const resourceTypeLabels: Record<HaulResource['type'], string> = {
  QUARRY: 'Quarry',
  ASPHALT_PLANT: 'Asphalt Plant',
  CONCRETE_PLANT: 'Concrete Plant',
  BORROW_PIT: 'Borrow Pit',
  DISPOSAL_SITE: 'Disposal Site',
  BATCH_PLANT: 'Batch Plant',
};

const resourceTypeIcons: Record<HaulResource['type'], React.ReactNode> = {
  QUARRY: <Mountain size={18} />,
  ASPHALT_PLANT: <Factory size={18} />,
  CONCRETE_PLANT: <Building2 size={18} />,
  BORROW_PIT: <MapPin size={18} />,
  DISPOSAL_SITE: <Trash2 size={18} />,
  BATCH_PLANT: <Factory size={18} />,
};

const resourceTypeColors: Record<HaulResource['type'], string> = {
  QUARRY: 'resource-quarry',
  ASPHALT_PLANT: 'resource-asphalt',
  CONCRETE_PLANT: 'resource-concrete',
  BORROW_PIT: 'resource-borrow',
  DISPOSAL_SITE: 'resource-disposal',
  BATCH_PLANT: 'resource-batch',
};

// Estimated haul costs per mile
const HAUL_COST_PER_MILE = 4.50; // $/mile for tri-axle dump

export function HaulRouteMap() {
  const [filter, setFilter] = useState<ResourceFilter>('ALL');
  const [expandedResource, setExpandedResource] = useState<string | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Filter resources
  const filteredResources = useMemo(() => {
    if (filter === 'ALL') return mockHaulResources;
    return mockHaulResources.filter((r) => r.type === filter);
  }, [filter]);

  // Sort by distance
  const sortedResources = useMemo(() => {
    return [...filteredResources].sort((a, b) => a.distanceFromProject - b.distanceFromProject);
  }, [filteredResources]);

  // Calculate haul economics
  const calculateHaulEconomics = (resource: HaulResource) => {
    const roundTripMiles = resource.distanceFromProject * 2;
    const roundTripTime = resource.travelTime * 2 + 15; // Add 15 min for loading/unloading
    const loadsPerHour = 60 / roundTripTime;
    const costPerLoad = roundTripMiles * HAUL_COST_PER_MILE;
    const loadsPerDay = loadsPerHour * 8; // 8-hour day

    return {
      roundTripMiles,
      roundTripTime,
      loadsPerHour: loadsPerHour.toFixed(1),
      costPerLoad: costPerLoad.toFixed(2),
      loadsPerDay: Math.floor(loadsPerDay),
    };
  };

  // Get resource type counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: mockHaulResources.length };
    mockHaulResources.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="haul-route-map">
      {/* Header */}
      <div className="haul-header">
        <div className="header-info">
          <div className="header-icon">
            <Truck size={24} />
          </div>
          <div>
            <h2>Haul Route Intel</h2>
            <p>Material sources & disposal sites within range of project</p>
          </div>
        </div>
        <div className="header-meta">
          <span className="project-location">
            <MapPin size={14} />
            {mockProject.county} County, WV
          </span>
        </div>
      </div>

      {/* Map Placeholder (for future Mapbox integration) */}
      <div className="map-container">
        <div className="map-placeholder">
          <Navigation size={48} />
          <h3>Interactive Map Coming Soon</h3>
          <p>
            Mapbox integration will display all resources on an interactive map with route visualization
          </p>
          <div className="map-legend">
            {Object.entries(resourceTypeLabels).map(([type, label]) => (
              <div key={type} className={`legend-item ${resourceTypeColors[type as HaulResource['type']]}`}>
                {resourceTypeIcons[type as HaulResource['type']]}
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resource Stats */}
      <div className="resource-stats">
        <div className="stat-card">
          <Mountain size={20} />
          <div className="stat-content">
            <span className="stat-value">{typeCounts['QUARRY'] || 0}</span>
            <span className="stat-label">Quarries</span>
          </div>
        </div>
        <div className="stat-card">
          <Factory size={20} />
          <div className="stat-content">
            <span className="stat-value">{typeCounts['ASPHALT_PLANT'] || 0}</span>
            <span className="stat-label">Asphalt Plants</span>
          </div>
        </div>
        <div className="stat-card">
          <Building2 size={20} />
          <div className="stat-content">
            <span className="stat-value">{typeCounts['CONCRETE_PLANT'] || 0}</span>
            <span className="stat-label">Concrete Plants</span>
          </div>
        </div>
        <div className="stat-card">
          <MapPin size={20} />
          <div className="stat-content">
            <span className="stat-value">{mockHaulResources.reduce((min, r) => Math.min(min, r.distanceFromProject), 100).toFixed(1)} mi</span>
            <span className="stat-label">Nearest Source</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-dropdown">
          <button className="filter-btn" onClick={() => setShowFilterMenu(!showFilterMenu)}>
            <Filter size={16} />
            {filter === 'ALL' ? 'All Resources' : resourceTypeLabels[filter]}
            <span className="filter-count">{typeCounts[filter]}</span>
            <ChevronDown size={14} />
          </button>
          {showFilterMenu && (
            <div className="filter-menu">
              <button
                className={`filter-option ${filter === 'ALL' ? 'active' : ''}`}
                onClick={() => {
                  setFilter('ALL');
                  setShowFilterMenu(false);
                }}
              >
                All Resources
                <span className="option-count">{typeCounts['ALL']}</span>
              </button>
              {Object.entries(resourceTypeLabels).map(([type, label]) => (
                <button
                  key={type}
                  className={`filter-option ${filter === type ? 'active' : ''}`}
                  onClick={() => {
                    setFilter(type as ResourceFilter);
                    setShowFilterMenu(false);
                  }}
                >
                  {resourceTypeIcons[type as HaulResource['type']]}
                  {label}
                  <span className="option-count">{typeCounts[type] || 0}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="results-info">{sortedResources.length} resources found, sorted by distance</span>
      </div>

      {/* Resources List */}
      <div className="resources-list">
        {sortedResources.map((resource) => {
          const isExpanded = expandedResource === resource.id;
          const economics = calculateHaulEconomics(resource);

          return (
            <div
              key={resource.id}
              className={`resource-card ${resourceTypeColors[resource.type]} ${isExpanded ? 'expanded' : ''}`}
            >
              <div className="resource-header" onClick={() => setExpandedResource(isExpanded ? null : resource.id)}>
                <div className="resource-icon">{resourceTypeIcons[resource.type]}</div>
                <div className="resource-info">
                  <h3 className="resource-name">{resource.name}</h3>
                  <p className="resource-location">
                    {resource.city}, {resource.state}
                  </p>
                </div>
                <div className="resource-metrics">
                  <div className="metric">
                    <Route size={14} />
                    <span>{resource.distanceFromProject} mi</span>
                  </div>
                  <div className="metric">
                    <Clock size={14} />
                    <span>{resource.travelTime} min</span>
                  </div>
                  {resource.wvdohApproved && (
                    <div className="approved-badge">
                      <CheckCircle size={14} />
                      WVDOH
                    </div>
                  )}
                </div>
                <span className="expand-icon">
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
              </div>

              {isExpanded && (
                <div className="resource-details">
                  {/* Materials */}
                  <div className="detail-section">
                    <h4>Available Materials</h4>
                    <div className="materials-list">
                      {resource.materials.map((material, idx) => (
                        <span key={idx} className="material-tag">
                          {material}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Haul Economics */}
                  <div className="detail-section">
                    <h4>Haul Economics</h4>
                    <div className="economics-grid">
                      <div className="econ-item">
                        <Route size={16} />
                        <span className="econ-label">Round Trip</span>
                        <span className="econ-value">{economics.roundTripMiles} mi</span>
                      </div>
                      <div className="econ-item">
                        <Clock size={16} />
                        <span className="econ-label">Cycle Time</span>
                        <span className="econ-value">{economics.roundTripTime} min</span>
                      </div>
                      <div className="econ-item">
                        <Gauge size={16} />
                        <span className="econ-label">Loads/Hour</span>
                        <span className="econ-value">{economics.loadsPerHour}</span>
                      </div>
                      <div className="econ-item">
                        <DollarSign size={16} />
                        <span className="econ-label">Cost/Load</span>
                        <span className="econ-value">${economics.costPerLoad}</span>
                      </div>
                      <div className="econ-item">
                        <Truck size={16} />
                        <span className="econ-label">Loads/Day</span>
                        <span className="econ-value">{economics.loadsPerDay}</span>
                      </div>
                      {resource.hourlyCapacity && (
                        <div className="econ-item">
                          <Factory size={16} />
                          <span className="econ-label">Plant Capacity</span>
                          <span className="econ-value">{resource.hourlyCapacity} TPH</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact & Hours */}
                  <div className="detail-section contact-section">
                    <div className="contact-info">
                      {resource.contactName && (
                        <div className="contact-item">
                          <span className="contact-label">Contact:</span>
                          <span>{resource.contactName}</span>
                        </div>
                      )}
                      {resource.contactPhone && (
                        <div className="contact-item">
                          <Phone size={14} />
                          <a href={`tel:${resource.contactPhone}`}>{resource.contactPhone}</a>
                        </div>
                      )}
                    </div>
                    {resource.operatingHours && (
                      <div className="hours-info">
                        <Clock size={14} />
                        <span>{resource.operatingHours}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {resource.notes && (
                    <div className="detail-section notes-section">
                      <AlertCircle size={14} />
                      <p>{resource.notes}</p>
                    </div>
                  )}

                  {/* Get Directions Button */}
                  <div className="actions-row">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${resource.coordinates.lat},${resource.coordinates.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="directions-btn"
                    >
                      <Navigation size={16} />
                      Get Directions
                      <ArrowRight size={14} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
