import { useState, useEffect } from 'react';
import {
  Award,
  Users,
  Truck,
  Search,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Star,
  User,
  Shield,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './OperatorQualifications.css';

interface OperatorQualification {
  id: string;
  crew_member_id: string;
  employee_id: string | null;
  display_name?: string;
  employee_number?: string;
  equipment_type_id: string | null;
  equipment_category: string;
  equipment_make: string | null;
  equipment_model: string | null;
  qualification_level: string;
  certification_date: string | null;
  expiration_date: string | null;
  last_operated_date: string | null;
  total_hours_operated: number | null;
  is_trainer_qualified: boolean;
  trainer_certification_date: string | null;
  training_notes: string | null;
  verified_by: string | null;
  verified_date: string | null;
  status: 'active' | 'expired' | 'suspended' | 'pending';
  created_at: string;
}

interface QualificationStats {
  totalQualifications: number;
  activeQualifications: number;
  expiringQualifications: number;
  trainers: number;
  operatorsWithMultiple: number;
  equipmentTypesCovered: number;
}

interface EquipmentNeedingOperators {
  equipment_category: string;
  count: number;
  qualified_operators: number;
}

export function OperatorQualifications() {
  const [qualifications, setQualifications] = useState<OperatorQualification[]>([]);
  const [stats, setStats] = useState<QualificationStats | null>(null);
  const [_equipmentNeeds, setEquipmentNeeds] = useState<EquipmentNeedingOperators[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'by-operator' | 'by-equipment'>('by-operator');
  const [selectedQual, setSelectedQual] = useState<OperatorQualification | null>(null);

  useEffect(() => {
    loadQualificationData();
  }, []);

  const loadQualificationData = async () => {
    setIsLoading(true);
    try {
      // Load operator qualifications with crew member info
      const { data: qualData, error } = await supabase
        .from('operator_qualifications')
        .select(`
          *,
          crew_members:crew_member_id(
            display_name,
            employee_id
          ),
          employees:crew_members(
            employees:employee_id(
              display_name,
              employee_number
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedQuals = (qualData || []).map((q: any) => {
        const now = new Date();
        let status: 'active' | 'expired' | 'suspended' | 'pending' = 'active';

        if (q.expiration_date) {
          const expDate = new Date(q.expiration_date);
          if (expDate < now) {
            status = 'expired';
          }
        }

        return {
          ...q,
          display_name: q.crew_members?.display_name ||
            q.employees?.employees?.display_name ||
            'Unknown',
          employee_number: q.employees?.employees?.employee_number,
          status,
        };
      });

      setQualifications(formattedQuals);

      // Calculate stats
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const active = formattedQuals.filter((q: OperatorQualification) => q.status === 'active');
      const expiring = formattedQuals.filter((q: OperatorQualification) => {
        if (!q.expiration_date) return false;
        const expDate = new Date(q.expiration_date);
        return expDate >= now && expDate <= thirtyDaysFromNow;
      });
      const trainers = formattedQuals.filter((q: OperatorQualification) => q.is_trainer_qualified);

      const operatorCounts = new Map<string, number>();
      formattedQuals.forEach((q: OperatorQualification) => {
        if (q.status === 'active') {
          const count = operatorCounts.get(q.crew_member_id) || 0;
          operatorCounts.set(q.crew_member_id, count + 1);
        }
      });
      const multipleQuals = Array.from(operatorCounts.values()).filter(c => c > 1).length;

      const categories = new Set(formattedQuals.map((q: OperatorQualification) => q.equipment_category));

      setStats({
        totalQualifications: formattedQuals.length,
        activeQualifications: active.length,
        expiringQualifications: expiring.length,
        trainers: trainers.length,
        operatorsWithMultiple: multipleQuals,
        equipmentTypesCovered: categories.size,
      });

      // Calculate equipment needs (simplified - would need equipment counts in real scenario)
      const categoryQualCounts = new Map<string, number>();
      active.forEach((q: OperatorQualification) => {
        const count = categoryQualCounts.get(q.equipment_category) || 0;
        categoryQualCounts.set(q.equipment_category, count + 1);
      });

      const needs: EquipmentNeedingOperators[] = Array.from(categoryQualCounts.entries()).map(
        ([category, qualified]) => ({
          equipment_category: category,
          count: 0, // Would need equipment count data
          qualified_operators: qualified,
        })
      );
      setEquipmentNeeds(needs);
    } catch (error) {
      console.error('Error loading qualification data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredQualifications = qualifications.filter(qual => {
    const matchesSearch = searchTerm === '' ||
      qual.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qual.employee_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qual.equipment_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qual.equipment_make?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || qual.equipment_category === categoryFilter;
    const matchesLevel = levelFilter === 'all' || qual.qualification_level === levelFilter;
    const matchesStatus = statusFilter === 'all' || qual.status === statusFilter;

    return matchesSearch && matchesCategory && matchesLevel && matchesStatus;
  });

  // Group by operator for by-operator view
  const groupedByOperator = filteredQualifications.reduce((acc, qual) => {
    const key = qual.crew_member_id;
    if (!acc[key]) {
      acc[key] = {
        crew_member_id: qual.crew_member_id,
        display_name: qual.display_name,
        employee_number: qual.employee_number,
        qualifications: [],
      };
    }
    acc[key].qualifications.push(qual);
    return acc;
  }, {} as Record<string, { crew_member_id: string; display_name?: string; employee_number?: string; qualifications: OperatorQualification[] }>);

  // Group by equipment category for by-equipment view
  const groupedByEquipment = filteredQualifications.reduce((acc, qual) => {
    const key = qual.equipment_category;
    if (!acc[key]) {
      acc[key] = {
        equipment_category: key,
        operators: [],
      };
    }
    acc[key].operators.push(qual);
    return acc;
  }, {} as Record<string, { equipment_category: string; operators: OperatorQualification[] }>);

  const categories = [...new Set(qualifications.map(q => q.equipment_category))];

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'expert':
        return <span className="level-badge expert"><Star size={10} /> Expert</span>;
      case 'intermediate':
        return <span className="level-badge intermediate">Intermediate</span>;
      case 'beginner':
        return <span className="level-badge beginner">Beginner</span>;
      case 'trainee':
        return <span className="level-badge trainee">Trainee</span>;
      default:
        return <span className="level-badge">{level}</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="status-badge active"><CheckCircle size={10} /> Active</span>;
      case 'expired':
        return <span className="status-badge expired"><XCircle size={10} /> Expired</span>;
      case 'suspended':
        return <span className="status-badge suspended"><AlertTriangle size={10} /> Suspended</span>;
      case 'pending':
        return <span className="status-badge pending"><Clock size={10} /> Pending</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatHours = (hours: number | null) => {
    if (hours === null || hours === undefined) return '-';
    return hours.toLocaleString() + ' hrs';
  };

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="operator-qualifications loading">
        <div className="loading-spinner">
          <RefreshCw className="spin" />
          <span>Loading qualifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="operator-qualifications">
      <header className="dashboard-header">
        <div className="header-title">
          <Award size={28} />
          <h1>Operator Qualifications</h1>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'by-operator' ? 'active' : ''}`}
              onClick={() => setViewMode('by-operator')}
            >
              <Users size={16} />
              By Operator
            </button>
            <button
              className={`toggle-btn ${viewMode === 'by-equipment' ? 'active' : ''}`}
              onClick={() => setViewMode('by-equipment')}
            >
              <Truck size={16} />
              By Equipment
            </button>
          </div>
          <button className="btn btn-secondary" onClick={loadQualificationData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-primary">
            <Plus size={16} />
            Add Qualification
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Award />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalQualifications || 0}</span>
            <span className="stat-label">Total Qualifications</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <CheckCircle />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.activeQualifications || 0}</span>
            <span className="stat-label">Active</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <Clock />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.expiringQualifications || 0}</span>
            <span className="stat-label">Expiring Soon</span>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <Star />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.trainers || 0}</span>
            <span className="stat-label">Trainers</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Users />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.operatorsWithMultiple || 0}</span>
            <span className="stat-label">Multi-Qualified</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Truck />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.equipmentTypesCovered || 0}</span>
            <span className="stat-label">Equipment Types</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search operators or equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={16} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Equipment Types</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{formatCategory(cat)}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="all">All Levels</option>
            <option value="expert">Expert</option>
            <option value="intermediate">Intermediate</option>
            <option value="beginner">Beginner</option>
            <option value="trainee">Trainee</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* By Operator View */}
      {viewMode === 'by-operator' && (
        <div className="operator-cards">
          {Object.values(groupedByOperator).map(operator => (
            <div key={operator.crew_member_id} className="operator-card">
              <div className="operator-header">
                <div className="operator-info">
                  <User size={18} />
                  <div>
                    <span className="operator-name">{operator.display_name}</span>
                    {operator.employee_number && (
                      <span className="employee-number">#{operator.employee_number}</span>
                    )}
                  </div>
                </div>
                <div className="qualification-count">
                  <span>{operator.qualifications.filter(q => q.status === 'active').length}</span>
                  <span className="count-label">Active</span>
                </div>
              </div>
              <div className="qualifications-list">
                {operator.qualifications.map(qual => (
                  <div
                    key={qual.id}
                    className={`qualification-item ${qual.status}`}
                    onClick={() => setSelectedQual(qual)}
                  >
                    <div className="qual-main">
                      <Truck size={14} />
                      <span className="equipment-type">{formatCategory(qual.equipment_category)}</span>
                      {qual.equipment_make && qual.equipment_model && (
                        <span className="equipment-specific">
                          {qual.equipment_make} {qual.equipment_model}
                        </span>
                      )}
                    </div>
                    <div className="qual-meta">
                      {getLevelBadge(qual.qualification_level)}
                      {qual.is_trainer_qualified && (
                        <span className="trainer-badge"><Star size={10} /> Trainer</span>
                      )}
                      {getStatusBadge(qual.status)}
                    </div>
                    <ChevronRight size={14} className="chevron" />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedByOperator).length === 0 && (
            <div className="empty-state">
              <Award size={48} />
              <p>No operator qualifications found</p>
            </div>
          )}
        </div>
      )}

      {/* By Equipment View */}
      {viewMode === 'by-equipment' && (
        <div className="equipment-cards">
          {Object.values(groupedByEquipment).map(equip => (
            <div key={equip.equipment_category} className="equipment-card">
              <div className="equipment-header">
                <div className="equipment-info">
                  <Truck size={18} />
                  <span className="equipment-name">{formatCategory(equip.equipment_category)}</span>
                </div>
                <div className="operator-count">
                  <span>{equip.operators.filter(o => o.status === 'active').length}</span>
                  <span className="count-label">Qualified</span>
                </div>
              </div>
              <div className="operators-list">
                {equip.operators.map(qual => (
                  <div
                    key={qual.id}
                    className={`operator-item ${qual.status}`}
                    onClick={() => setSelectedQual(qual)}
                  >
                    <div className="op-main">
                      <User size={14} />
                      <span className="op-name">{qual.display_name}</span>
                    </div>
                    <div className="op-meta">
                      {getLevelBadge(qual.qualification_level)}
                      {qual.is_trainer_qualified && (
                        <span className="trainer-badge"><Star size={10} /> Trainer</span>
                      )}
                      {qual.total_hours_operated && (
                        <span className="hours-operated">{formatHours(qual.total_hours_operated)}</span>
                      )}
                    </div>
                    <ChevronRight size={14} className="chevron" />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(groupedByEquipment).length === 0 && (
            <div className="empty-state">
              <Truck size={48} />
              <p>No equipment qualifications found</p>
            </div>
          )}
        </div>
      )}

      {/* Qualification Detail Panel */}
      {selectedQual && (
        <div className="qualification-detail-panel">
          <div className="detail-header">
            <h3>Qualification Details</h3>
            <button onClick={() => setSelectedQual(null)}>×</button>
          </div>
          <div className="detail-content">
            <div className="detail-row">
              <span className="label">Operator</span>
              <span className="value">{selectedQual.display_name}</span>
            </div>
            {selectedQual.employee_number && (
              <div className="detail-row">
                <span className="label">Employee #</span>
                <span className="value">{selectedQual.employee_number}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="label">Equipment Category</span>
              <span className="value">{formatCategory(selectedQual.equipment_category)}</span>
            </div>
            {selectedQual.equipment_make && (
              <div className="detail-row">
                <span className="label">Make/Model</span>
                <span className="value">{selectedQual.equipment_make} {selectedQual.equipment_model}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="label">Qualification Level</span>
              <span className="value">{getLevelBadge(selectedQual.qualification_level)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Status</span>
              <span className="value">{getStatusBadge(selectedQual.status)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Certification Date</span>
              <span className="value">{formatDate(selectedQual.certification_date)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Expiration Date</span>
              <span className="value">{formatDate(selectedQual.expiration_date)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Last Operated</span>
              <span className="value">{formatDate(selectedQual.last_operated_date)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Total Hours Operated</span>
              <span className="value">{formatHours(selectedQual.total_hours_operated)}</span>
            </div>

            <div className="detail-section">
              <h4>Trainer Status</h4>
              {selectedQual.is_trainer_qualified ? (
                <div className="trainer-info">
                  <Star className="trainer-icon" />
                  <div>
                    <span className="trainer-status">Trainer Qualified</span>
                    <span className="trainer-date">
                      Since {formatDate(selectedQual.trainer_certification_date)}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="no-trainer">Not trainer qualified</span>
              )}
            </div>

            {selectedQual.training_notes && (
              <div className="detail-row">
                <span className="label">Training Notes</span>
                <span className="value notes">{selectedQual.training_notes}</span>
              </div>
            )}

            {selectedQual.verified_by && (
              <div className="detail-section">
                <h4>Verification</h4>
                <div className="verification-info">
                  <Shield size={16} />
                  <div>
                    <span>Verified by {selectedQual.verified_by}</span>
                    <span className="verify-date">{formatDate(selectedQual.verified_date)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="detail-actions">
            <button className="btn btn-secondary">View History</button>
            <button className="btn btn-primary">Edit Qualification</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorQualifications;
