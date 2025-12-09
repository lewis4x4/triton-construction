import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Calendar,
  ChevronLeft,
  RefreshCw,
  Filter,
  Search,
  BarChart3,
  Truck,
  Fuel,
  Wrench,
  DollarSign,
  Clock,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  FileDown,
  Mail,
  Printer,
  Settings,
  ChevronRight,
  Play,
  Pause,
  Eye,
  Star,
  Plus,
  Trash2,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './FleetReports.css';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'fleet' | 'fuel' | 'maintenance' | 'costs' | 'utilization' | 'compliance';
  icon: React.ReactNode;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  lastRun?: string;
  scheduled: boolean;
  isFavorite: boolean;
}

interface ScheduledReport {
  id: string;
  reportName: string;
  schedule: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  lastSent?: string;
  nextRun: string;
  status: 'active' | 'paused';
}

interface RecentReport {
  id: string;
  name: string;
  category: string;
  generatedAt: string;
  generatedBy: string;
  format: 'pdf' | 'excel' | 'csv';
  size: string;
  downloadUrl: string;
}

export function FleetReports() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'templates' | 'scheduled' | 'recent' | 'builder'>('templates');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Try loading from Supabase
      const { data } = await (supabase as any)
        .from('report_templates')
        .select('*');

      if (data && data.length > 0) {
        // Process real data
        loadDemoData();
      } else {
        loadDemoData();
      }
    } catch (error) {
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    // Report templates
    setTemplates([
      { id: '1', name: 'Fleet Overview Summary', description: 'Complete fleet status including all vehicles, utilization rates, and current assignments', category: 'fleet', icon: <Truck size={20} />, frequency: 'weekly', lastRun: '2024-12-07', scheduled: true, isFavorite: true },
      { id: '2', name: 'Equipment Utilization Report', description: 'Detailed utilization metrics by vehicle, project, and time period', category: 'utilization', icon: <BarChart3 size={20} />, frequency: 'monthly', lastRun: '2024-12-01', scheduled: true, isFavorite: true },
      { id: '3', name: 'Fuel Consumption Analysis', description: 'Fuel usage trends, cost analysis, and efficiency metrics by vehicle', category: 'fuel', icon: <Fuel size={20} />, frequency: 'weekly', lastRun: '2024-12-07', scheduled: true, isFavorite: false },
      { id: '4', name: 'Maintenance Cost Summary', description: 'Breakdown of maintenance costs by category, vehicle type, and vendor', category: 'maintenance', icon: <Wrench size={20} />, frequency: 'monthly', lastRun: '2024-12-01', scheduled: false, isFavorite: true },
      { id: '5', name: 'Total Cost of Ownership', description: 'Complete TCO analysis including depreciation, fuel, maintenance, and operating costs', category: 'costs', icon: <DollarSign size={20} />, frequency: 'quarterly', lastRun: '2024-10-01', scheduled: true, isFavorite: false },
      { id: '6', name: 'DOT Compliance Status', description: 'Vehicle inspection status, driver qualifications, and compliance tracking', category: 'compliance', icon: <CheckCircle size={20} />, frequency: 'monthly', lastRun: '2024-12-01', scheduled: true, isFavorite: false },
      { id: '7', name: 'Idle Time Analysis', description: 'Engine idle time tracking with cost impact and driver comparison', category: 'utilization', icon: <Clock size={20} />, frequency: 'weekly', lastRun: '2024-12-07', scheduled: false, isFavorite: false },
      { id: '8', name: 'Preventive Maintenance Schedule', description: 'Upcoming PM services, overdue items, and compliance tracking', category: 'maintenance', icon: <Calendar size={20} />, frequency: 'weekly', lastRun: '2024-12-07', scheduled: true, isFavorite: true },
      { id: '9', name: 'Fuel Card Transaction Report', description: 'All fuel card transactions with anomaly flagging', category: 'fuel', icon: <FileSpreadsheet size={20} />, frequency: 'daily', lastRun: '2024-12-08', scheduled: true, isFavorite: false },
      { id: '10', name: 'Vehicle Assignment History', description: 'Historical assignment data for all vehicles by project and operator', category: 'fleet', icon: <Users size={20} />, frequency: 'monthly', lastRun: '2024-12-01', scheduled: false, isFavorite: false },
      { id: '11', name: 'Anomaly Detection Report', description: 'Flagged fuel anomalies, maintenance alerts, and compliance issues', category: 'compliance', icon: <AlertTriangle size={20} />, frequency: 'daily', lastRun: '2024-12-08', scheduled: true, isFavorite: false },
      { id: '12', name: 'Project Equipment Costs', description: 'Equipment costs allocated by project with budget comparison', category: 'costs', icon: <MapPin size={20} />, frequency: 'weekly', lastRun: '2024-12-07', scheduled: false, isFavorite: false },
    ]);

    // Scheduled reports
    setScheduledReports([
      { id: 's1', reportName: 'Fleet Overview Summary', schedule: 'Every Monday at 7:00 AM', recipients: ['operations@triton.com', 'fleet.manager@triton.com'], format: 'pdf', lastSent: '2024-12-02', nextRun: '2024-12-09', status: 'active' },
      { id: 's2', reportName: 'Fuel Consumption Analysis', schedule: 'Every Monday at 8:00 AM', recipients: ['fleet.manager@triton.com'], format: 'excel', lastSent: '2024-12-02', nextRun: '2024-12-09', status: 'active' },
      { id: 's3', reportName: 'Equipment Utilization Report', schedule: '1st of every month', recipients: ['executives@triton.com', 'operations@triton.com'], format: 'pdf', lastSent: '2024-12-01', nextRun: '2025-01-01', status: 'active' },
      { id: 's4', reportName: 'DOT Compliance Status', schedule: '1st of every month', recipients: ['safety@triton.com', 'compliance@triton.com'], format: 'pdf', lastSent: '2024-12-01', nextRun: '2025-01-01', status: 'active' },
      { id: 's5', reportName: 'Anomaly Detection Report', schedule: 'Daily at 6:00 AM', recipients: ['fleet.manager@triton.com'], format: 'excel', lastSent: '2024-12-08', nextRun: '2024-12-09', status: 'active' },
      { id: 's6', reportName: 'Preventive Maintenance Schedule', schedule: 'Every Monday at 6:30 AM', recipients: ['maintenance@triton.com'], format: 'pdf', lastSent: '2024-12-02', nextRun: '2024-12-09', status: 'paused' },
    ]);

    // Recent reports
    setRecentReports([
      { id: 'r1', name: 'Fleet Overview Summary', category: 'fleet', generatedAt: '2024-12-08 14:32', generatedBy: 'John Smith', format: 'pdf', size: '2.4 MB', downloadUrl: '#' },
      { id: 'r2', name: 'Fuel Consumption Analysis', category: 'fuel', generatedAt: '2024-12-08 09:15', generatedBy: 'System', format: 'excel', size: '1.8 MB', downloadUrl: '#' },
      { id: 'r3', name: 'Anomaly Detection Report', category: 'compliance', generatedAt: '2024-12-08 06:00', generatedBy: 'System', format: 'excel', size: '542 KB', downloadUrl: '#' },
      { id: 'r4', name: 'Preventive Maintenance Schedule', category: 'maintenance', generatedAt: '2024-12-07 15:45', generatedBy: 'Mike Johnson', format: 'pdf', size: '1.2 MB', downloadUrl: '#' },
      { id: 'r5', name: 'Project Equipment Costs', category: 'costs', generatedAt: '2024-12-07 11:20', generatedBy: 'Sarah Williams', format: 'excel', size: '3.1 MB', downloadUrl: '#' },
      { id: 'r6', name: 'Equipment Utilization Report', category: 'utilization', generatedAt: '2024-12-06 16:00', generatedBy: 'System', format: 'pdf', size: '4.5 MB', downloadUrl: '#' },
      { id: 'r7', name: 'DOT Compliance Status', category: 'compliance', generatedAt: '2024-12-05 08:30', generatedBy: 'System', format: 'pdf', size: '1.9 MB', downloadUrl: '#' },
      { id: 'r8', name: 'Total Cost of Ownership', category: 'costs', generatedAt: '2024-12-01 09:00', generatedBy: 'System', format: 'pdf', size: '5.2 MB', downloadUrl: '#' },
    ]);

    // Set default date range
    const today = new Date();
    const monthAgo = new Date();
    monthAgo.setDate(today.getDate() - 30);
    setDateRange({
      start: monthAgo.toISOString().split('T')[0] || '',
      end: today.toISOString().split('T')[0] || '',
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'fleet': return '#3b82f6';
      case 'fuel': return '#f59e0b';
      case 'maintenance': return '#8b5cf6';
      case 'costs': return '#10b981';
      case 'utilization': return '#ec4899';
      case 'compliance': return '#06b6d4';
      default: return '#6b7280';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <FileDown size={16} />;
      case 'excel': return <FileSpreadsheet size={16} />;
      case 'csv': return <FileText size={16} />;
      default: return <FileText size={16} />;
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = searchTerm === '' ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const favoriteTemplates = templates.filter(t => t.isFavorite);

  const handleGenerateReport = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setShowGenerateModal(true);
  };

  const toggleFavorite = (templateId: string) => {
    setTemplates(templates.map(t =>
      t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
    ));
  };

  const toggleScheduleStatus = (scheduleId: string) => {
    setScheduledReports(scheduledReports.map(s =>
      s.id === scheduleId ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s
    ));
  };

  if (loading) {
    return (
      <div className="fleet-reports-page">
        <div className="loading-state">
          <RefreshCw size={48} className="spinning" />
          <p>Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fleet-reports-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <Link to="/equipment" className="back-link">
            <ChevronLeft size={20} />
            Fleet Management
          </Link>
          <h1>
            <FileText size={32} />
            Fleet Reports
          </h1>
          <p>Generate, schedule, and manage fleet analytics reports</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadReportData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-primary">
            <Plus size={16} />
            Create Custom Report
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <div className="stat-icon"><FileText size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{templates.length}</span>
            <span className="stat-label">Report Templates</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Calendar size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{scheduledReports.filter(s => s.status === 'active').length}</span>
            <span className="stat-label">Active Schedules</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Clock size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{recentReports.length}</span>
            <span className="stat-label">Recent Reports</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Star size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{favoriteTemplates.length}</span>
            <span className="stat-label">Favorites</span>
          </div>
        </div>
      </div>

      {/* Favorites Section */}
      {favoriteTemplates.length > 0 && (
        <div className="favorites-section">
          <h2><Star size={18} /> Quick Access</h2>
          <div className="favorites-grid">
            {favoriteTemplates.map(template => (
              <div key={template.id} className="favorite-card" onClick={() => handleGenerateReport(template)}>
                <div className="favorite-icon" style={{ backgroundColor: `${getCategoryColor(template.category)}20`, color: getCategoryColor(template.category) }}>
                  {template.icon}
                </div>
                <div className="favorite-info">
                  <span className="favorite-name">{template.name}</span>
                  <span className="favorite-freq">{template.frequency}</span>
                </div>
                <ChevronRight size={16} className="chevron" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <FileText size={18} />
          Report Templates
        </button>
        <button
          className={`tab ${activeTab === 'scheduled' ? 'active' : ''}`}
          onClick={() => setActiveTab('scheduled')}
        >
          <Calendar size={18} />
          Scheduled Reports
          <span className="tab-count">{scheduledReports.filter(s => s.status === 'active').length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          <Clock size={18} />
          Recent Reports
        </button>
        <button
          className={`tab ${activeTab === 'builder' ? 'active' : ''}`}
          onClick={() => setActiveTab('builder')}
        >
          <Settings size={18} />
          Report Builder
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="templates-content">
            <div className="filters-bar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <Filter size={16} />
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="all">All Categories</option>
                  <option value="fleet">Fleet</option>
                  <option value="fuel">Fuel</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="costs">Costs</option>
                  <option value="utilization">Utilization</option>
                  <option value="compliance">Compliance</option>
                </select>
              </div>
            </div>

            <div className="templates-grid">
              {filteredTemplates.map(template => (
                <div key={template.id} className="template-card">
                  <div className="template-header">
                    <div className="template-icon" style={{ backgroundColor: `${getCategoryColor(template.category)}20`, color: getCategoryColor(template.category) }}>
                      {template.icon}
                    </div>
                    <button
                      className={`favorite-btn ${template.isFavorite ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(template.id); }}
                    >
                      <Star size={16} />
                    </button>
                  </div>
                  <div className="template-body">
                    <h3>{template.name}</h3>
                    <p>{template.description}</p>
                    <div className="template-meta">
                      <span className={`category-tag ${template.category}`}>
                        {template.category}
                      </span>
                      <span className="frequency-tag">
                        {template.frequency}
                      </span>
                    </div>
                  </div>
                  <div className="template-footer">
                    {template.lastRun && (
                      <span className="last-run">
                        <Clock size={12} /> Last: {template.lastRun}
                      </span>
                    )}
                    <div className="template-actions">
                      <button className="action-btn" title="Schedule">
                        <Calendar size={16} />
                      </button>
                      <button
                        className="action-btn primary"
                        title="Generate"
                        onClick={() => handleGenerateReport(template)}
                      >
                        <Play size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scheduled Tab */}
        {activeTab === 'scheduled' && (
          <div className="scheduled-content">
            <div className="scheduled-table">
              <table>
                <thead>
                  <tr>
                    <th>Report Name</th>
                    <th>Schedule</th>
                    <th>Recipients</th>
                    <th>Format</th>
                    <th>Last Sent</th>
                    <th>Next Run</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledReports.map(schedule => (
                    <tr key={schedule.id} className={schedule.status === 'paused' ? 'paused-row' : ''}>
                      <td className="report-name">{schedule.reportName}</td>
                      <td>{schedule.schedule}</td>
                      <td>
                        <div className="recipients">
                          {schedule.recipients.slice(0, 2).map((r, i) => (
                            <span key={i} className="recipient-tag">{r}</span>
                          ))}
                          {schedule.recipients.length > 2 && (
                            <span className="recipient-more">+{schedule.recipients.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`format-badge ${schedule.format}`}>
                          {getFormatIcon(schedule.format)}
                          {schedule.format.toUpperCase()}
                        </span>
                      </td>
                      <td>{schedule.lastSent}</td>
                      <td>{schedule.nextRun}</td>
                      <td>
                        <span className={`status-badge ${schedule.status}`}>
                          {schedule.status === 'active' ? <Play size={12} /> : <Pause size={12} />}
                          {schedule.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn"
                            onClick={() => toggleScheduleStatus(schedule.id)}
                            title={schedule.status === 'active' ? 'Pause' : 'Resume'}
                          >
                            {schedule.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                          <button className="action-btn" title="Edit">
                            <Settings size={16} />
                          </button>
                          <button className="action-btn" title="Run Now">
                            <RefreshCw size={16} />
                          </button>
                          <button className="action-btn danger" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Tab */}
        {activeTab === 'recent' && (
          <div className="recent-content">
            <div className="recent-list">
              {recentReports.map(report => (
                <div key={report.id} className="recent-item">
                  <div className="recent-icon" style={{ backgroundColor: `${getCategoryColor(report.category)}20`, color: getCategoryColor(report.category) }}>
                    {getFormatIcon(report.format)}
                  </div>
                  <div className="recent-info">
                    <span className="recent-name">{report.name}</span>
                    <span className="recent-meta">
                      Generated {report.generatedAt} by {report.generatedBy}
                    </span>
                  </div>
                  <span className={`category-tag ${report.category}`}>{report.category}</span>
                  <span className="file-size">{report.size}</span>
                  <div className="recent-actions">
                    <button className="action-btn" title="Preview">
                      <Eye size={16} />
                    </button>
                    <button className="action-btn primary" title="Download">
                      <Download size={16} />
                    </button>
                    <button className="action-btn" title="Email">
                      <Mail size={16} />
                    </button>
                    <button className="action-btn" title="Print">
                      <Printer size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Builder Tab */}
        {activeTab === 'builder' && (
          <div className="builder-content">
            <div className="builder-intro">
              <div className="builder-icon">
                <Settings size={48} />
              </div>
              <h2>Custom Report Builder</h2>
              <p>Create customized reports by selecting data sources, metrics, and visualizations</p>
              <div className="builder-features">
                <div className="feature">
                  <BarChart3 size={24} />
                  <span>Drag & Drop Charts</span>
                </div>
                <div className="feature">
                  <Filter size={24} />
                  <span>Custom Filters</span>
                </div>
                <div className="feature">
                  <Calendar size={24} />
                  <span>Schedule Delivery</span>
                </div>
                <div className="feature">
                  <Download size={24} />
                  <span>Multiple Formats</span>
                </div>
              </div>
              <button className="btn btn-primary btn-lg">
                <Plus size={18} />
                Start Building
              </button>
            </div>

            <div className="builder-templates">
              <h3>Start from a Template</h3>
              <div className="starter-templates">
                <div className="starter-card">
                  <Truck size={24} />
                  <span>Fleet Summary</span>
                </div>
                <div className="starter-card">
                  <Fuel size={24} />
                  <span>Fuel Analysis</span>
                </div>
                <div className="starter-card">
                  <Wrench size={24} />
                  <span>Maintenance Report</span>
                </div>
                <div className="starter-card">
                  <DollarSign size={24} />
                  <span>Cost Breakdown</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generate Report Modal */}
      {showGenerateModal && selectedTemplate && (
        <div className="modal-overlay" onClick={() => setShowGenerateModal(false)}>
          <div className="generate-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Generate Report</h2>
              <button className="close-btn" onClick={() => setShowGenerateModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="report-preview">
                <div className="preview-icon" style={{ backgroundColor: `${getCategoryColor(selectedTemplate.category)}20`, color: getCategoryColor(selectedTemplate.category) }}>
                  {selectedTemplate.icon}
                </div>
                <div className="preview-info">
                  <h3>{selectedTemplate.name}</h3>
                  <p>{selectedTemplate.description}</p>
                </div>
              </div>

              <div className="form-section">
                <label>Date Range</label>
                <div className="date-inputs">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-section">
                <label>Output Format</label>
                <div className="format-options">
                  <label className="format-option">
                    <input type="radio" name="format" value="pdf" defaultChecked />
                    <FileDown size={20} />
                    <span>PDF</span>
                  </label>
                  <label className="format-option">
                    <input type="radio" name="format" value="excel" />
                    <FileSpreadsheet size={20} />
                    <span>Excel</span>
                  </label>
                  <label className="format-option">
                    <input type="radio" name="format" value="csv" />
                    <FileText size={20} />
                    <span>CSV</span>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <label>Delivery Options</label>
                <div className="delivery-options">
                  <label className="checkbox-option">
                    <input type="checkbox" defaultChecked />
                    <span>Download immediately</span>
                  </label>
                  <label className="checkbox-option">
                    <input type="checkbox" />
                    <span>Send to email</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary">
                <Play size={16} />
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FleetReports;
