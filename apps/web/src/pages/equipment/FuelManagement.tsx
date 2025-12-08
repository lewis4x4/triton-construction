import { useState, useEffect } from 'react';
import {
  Fuel,
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle,
  ChevronRight,
  DollarSign,
  Gauge,
  MapPin,
  AlertOctagon,
  Eye,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './FuelManagement.css';

interface FuelCard {
  id: string;
  card_number: string;
  card_provider: string;
  status: string;
  assigned_vehicle_id: string;
  vehicle_number: string;
  assigned_driver_id: string;
  driver_name: string;
  daily_limit: number;
  monthly_limit: number;
  current_month_spend: number;
  pin_required: boolean;
  odometer_required: boolean;
  expiry_date: string;
}

interface FuelTransaction {
  id: string;
  fuel_card_id: string;
  card_number: string;
  vehicle_id: string;
  vehicle_number: string;
  driver_id: string;
  driver_name: string;
  transaction_date: string;
  transaction_time: string;
  merchant_name: string;
  merchant_location: string;
  fuel_type: string;
  gallons: number;
  price_per_gallon: number;
  total_amount: number;
  odometer_reading: number;
  calculated_mpg: number;
  is_anomaly: boolean;
  anomaly_reason: string;
  anomaly_acknowledged: boolean;
  project_id: string;
  project_name: string;
}

interface FuelStats {
  totalCards: number;
  activeCards: number;
  totalTransactions: number;
  totalGallons: number;
  totalSpend: number;
  avgPricePerGallon: number;
  anomalyCount: number;
  unacknowledgedAnomalies: number;
}

export function FuelManagement() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'cards' | 'anomalies'>('transactions');
  const [transactions, setTransactions] = useState<FuelTransaction[]>([]);
  const [fuelCards, setFuelCards] = useState<FuelCard[]>([]);
  const [stats, setStats] = useState<FuelStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('30');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [anomalyFilter, setAnomalyFilter] = useState<string>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<FuelTransaction | null>(null);
  const [_selectedCard, setSelectedCard] = useState<FuelCard | null>(null);

  useEffect(() => {
    loadData();
  }, [dateFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Calculate date range
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateFilter));

      // Load fuel transactions
      const { data: txnData, error: txnError } = await (supabase as any)
        .from('fuel_transactions')
        .select(`
          *,
          fuel_cards(card_number),
          vehicles(vehicle_number),
          crew_members(display_name),
          projects(name)
        `)
        .gte('transaction_date', startDate.toISOString().split('T')[0])
        .order('transaction_date', { ascending: false });

      if (txnError) throw txnError;

      const txnList: FuelTransaction[] = (txnData || []).map((t: any) => ({
        id: t.id,
        fuel_card_id: t.fuel_card_id,
        card_number: t.fuel_cards?.card_number || 'N/A',
        vehicle_id: t.vehicle_id,
        vehicle_number: t.vehicles?.vehicle_number || 'N/A',
        driver_id: t.driver_id,
        driver_name: t.crew_members?.display_name || 'Unknown',
        transaction_date: t.transaction_date,
        transaction_time: t.transaction_time,
        merchant_name: t.merchant_name,
        merchant_location: t.merchant_location,
        fuel_type: t.fuel_type,
        gallons: t.gallons,
        price_per_gallon: t.price_per_gallon,
        total_amount: t.total_amount,
        odometer_reading: t.odometer_reading,
        calculated_mpg: t.calculated_mpg,
        is_anomaly: t.is_anomaly,
        anomaly_reason: t.anomaly_reason,
        anomaly_acknowledged: t.anomaly_acknowledged,
        project_id: t.project_id,
        project_name: t.projects?.name || 'N/A',
      }));

      setTransactions(txnList);

      // Load fuel cards
      const { data: cardData, error: cardError } = await (supabase as any)
        .from('fuel_cards')
        .select(`
          *,
          vehicles(vehicle_number),
          crew_members(display_name)
        `)
        .order('card_number');

      if (cardError) throw cardError;

      const cardList: FuelCard[] = (cardData || []).map((c: any) => ({
        id: c.id,
        card_number: c.card_number,
        card_provider: c.card_provider,
        status: c.status,
        assigned_vehicle_id: c.assigned_vehicle_id,
        vehicle_number: c.vehicles?.vehicle_number || 'Unassigned',
        assigned_driver_id: c.assigned_driver_id,
        driver_name: c.crew_members?.display_name || 'Unassigned',
        daily_limit: c.daily_limit,
        monthly_limit: c.monthly_limit,
        current_month_spend: c.current_month_spend || 0,
        pin_required: c.pin_required,
        odometer_required: c.odometer_required,
        expiry_date: c.expiry_date,
      }));

      setFuelCards(cardList);

      // Calculate stats
      const totalGallons = txnList.reduce((sum, t) => sum + (t.gallons || 0), 0);
      const totalSpend = txnList.reduce((sum, t) => sum + (t.total_amount || 0), 0);
      const anomalies = txnList.filter(t => t.is_anomaly);

      setStats({
        totalCards: cardList.length,
        activeCards: cardList.filter(c => c.status === 'active').length,
        totalTransactions: txnList.length,
        totalGallons,
        totalSpend,
        avgPricePerGallon: totalGallons > 0 ? totalSpend / totalGallons : 0,
        anomalyCount: anomalies.length,
        unacknowledgedAnomalies: anomalies.filter(a => !a.anomaly_acknowledged).length,
      });
    } catch (err) {
      console.error('Error loading fuel data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const acknowledgeAnomaly = async (transactionId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('fuel_transactions')
        .update({ anomaly_acknowledged: true, anomaly_acknowledged_at: new Date().toISOString() })
        .eq('id', transactionId);

      if (error) throw error;
      loadData();
    } catch (err) {
      console.error('Error acknowledging anomaly:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const vehicles = [...new Set(transactions.map(t => t.vehicle_number).filter(Boolean))];

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = searchTerm === '' ||
      t.vehicle_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.driver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.merchant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.card_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVehicle = vehicleFilter === 'all' || t.vehicle_number === vehicleFilter;
    const matchesAnomaly = anomalyFilter === 'all' ||
      (anomalyFilter === 'anomaly' && t.is_anomaly) ||
      (anomalyFilter === 'normal' && !t.is_anomaly);

    return matchesSearch && matchesVehicle && matchesAnomaly;
  });

  const anomalyTransactions = transactions.filter(t => t.is_anomaly && !t.anomaly_acknowledged);

  return (
    <div className="fuel-management-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Fuel size={28} /> Fuel Management</h1>
          <p>Track fuel cards, transactions, and detect anomalies</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Add Card
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon cards"><CreditCard size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.activeCards}/{stats.totalCards}</span>
              <span className="stat-label">Active Cards</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon transactions"><Fuel size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalTransactions}</span>
              <span className="stat-label">Transactions</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon gallons"><Gauge size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.totalGallons.toLocaleString()}</span>
              <span className="stat-label">Gallons</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon spend"><DollarSign size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(stats.totalSpend)}</span>
              <span className="stat-label">Total Spend</span>
            </div>
          </div>
          <div className={`stat-card ${stats.unacknowledgedAnomalies > 0 ? 'alert' : ''}`}>
            <div className="stat-icon anomaly"><AlertTriangle size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.unacknowledgedAnomalies}</span>
              <span className="stat-label">Unreviewed Anomalies</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <Fuel size={18} /> Transactions
        </button>
        <button
          className={`tab ${activeTab === 'cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('cards')}
        >
          <CreditCard size={18} /> Fuel Cards
        </button>
        <button
          className={`tab ${activeTab === 'anomalies' ? 'active' : ''}`}
          onClick={() => setActiveTab('anomalies')}
        >
          <AlertTriangle size={18} /> Anomalies
          {stats && stats.unacknowledgedAnomalies > 0 && (
            <span className="badge">{stats.unacknowledgedAnomalies}</span>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search transactions, vehicles, drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
          {activeTab === 'transactions' && (
            <>
              <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
                <option value="all">All Vehicles</option>
                {vehicles.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              <select value={anomalyFilter} onChange={(e) => setAnomalyFilter(e.target.value)}>
                <option value="all">All Transactions</option>
                <option value="anomaly">Anomalies Only</option>
                <option value="normal">Normal Only</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="content-area">
        {isLoading ? (
          <div className="loading-state">
            <RefreshCw className="spinning" size={32} />
            <p>Loading fuel data...</p>
          </div>
        ) : (
          <>
            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="transaction-list">
                {filteredTransactions.length === 0 ? (
                  <div className="empty-state">
                    <Fuel size={48} />
                    <p>No transactions found</p>
                  </div>
                ) : (
                  filteredTransactions.map(txn => (
                    <div
                      key={txn.id}
                      className={`transaction-card ${txn.is_anomaly ? 'anomaly' : ''}`}
                      onClick={() => setSelectedTransaction(txn)}
                    >
                      <div className="txn-header">
                        <div className="txn-identity">
                          <span className="txn-date">{formatDate(txn.transaction_date)}</span>
                          <span className="txn-vehicle">{txn.vehicle_number}</span>
                          {txn.is_anomaly && (
                            <span className="anomaly-badge">
                              <AlertTriangle size={14} /> Anomaly
                            </span>
                          )}
                        </div>
                        <span className="txn-amount">{formatCurrency(txn.total_amount)}</span>
                      </div>

                      <div className="txn-details">
                        <div className="detail-item">
                          <Fuel size={14} />
                          <span>{txn.gallons?.toFixed(1)} gal @ {formatCurrency(txn.price_per_gallon)}/gal</span>
                        </div>
                        <div className="detail-item">
                          <MapPin size={14} />
                          <span>{txn.merchant_name}</span>
                        </div>
                        <div className="detail-item">
                          <CreditCard size={14} />
                          <span>****{txn.card_number?.slice(-4)}</span>
                        </div>
                        {txn.calculated_mpg && (
                          <div className="detail-item">
                            <TrendingUp size={14} />
                            <span>{txn.calculated_mpg?.toFixed(1)} MPG</span>
                          </div>
                        )}
                      </div>

                      {txn.is_anomaly && txn.anomaly_reason && (
                        <div className="anomaly-reason">
                          <AlertOctagon size={14} />
                          <span>{txn.anomaly_reason}</span>
                        </div>
                      )}

                      <ChevronRight size={20} className="chevron" />
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Cards Tab */}
            {activeTab === 'cards' && (
              <div className="cards-grid">
                {fuelCards.length === 0 ? (
                  <div className="empty-state">
                    <CreditCard size={48} />
                    <p>No fuel cards found</p>
                  </div>
                ) : (
                  fuelCards.map(card => (
                    <div
                      key={card.id}
                      className={`fuel-card-item ${card.status !== 'active' ? 'inactive' : ''}`}
                      onClick={() => setSelectedCard(card)}
                    >
                      <div className="card-header">
                        <div className="card-provider">{card.card_provider}</div>
                        <span className={`status-badge ${card.status}`}>{card.status}</span>
                      </div>
                      <div className="card-number">****{card.card_number?.slice(-4)}</div>
                      <div className="card-details">
                        <div className="detail-row">
                          <span>Vehicle:</span>
                          <span>{card.vehicle_number}</span>
                        </div>
                        <div className="detail-row">
                          <span>Driver:</span>
                          <span>{card.driver_name}</span>
                        </div>
                        <div className="detail-row">
                          <span>Monthly Limit:</span>
                          <span>{formatCurrency(card.monthly_limit)}</span>
                        </div>
                        <div className="detail-row">
                          <span>Month Spend:</span>
                          <span>{formatCurrency(card.current_month_spend)}</span>
                        </div>
                      </div>
                      <div className="card-footer">
                        <span>Expires: {formatDate(card.expiry_date)}</span>
                        <div className="card-flags">
                          {card.pin_required && <span className="flag">PIN</span>}
                          {card.odometer_required && <span className="flag">ODO</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Anomalies Tab */}
            {activeTab === 'anomalies' && (
              <div className="anomaly-list">
                {anomalyTransactions.length === 0 ? (
                  <div className="empty-state success">
                    <CheckCircle size={48} />
                    <p>No unreviewed anomalies</p>
                    <span>All fuel transactions look normal</span>
                  </div>
                ) : (
                  anomalyTransactions.map(txn => (
                    <div key={txn.id} className="anomaly-card">
                      <div className="anomaly-header">
                        <div className="anomaly-icon">
                          <AlertTriangle size={24} />
                        </div>
                        <div className="anomaly-info">
                          <h3>{txn.anomaly_reason}</h3>
                          <p>{formatDate(txn.transaction_date)} - {txn.vehicle_number}</p>
                        </div>
                        <span className="anomaly-amount">{formatCurrency(txn.total_amount)}</span>
                      </div>

                      <div className="anomaly-details">
                        <div className="detail-col">
                          <label>Driver</label>
                          <span>{txn.driver_name}</span>
                        </div>
                        <div className="detail-col">
                          <label>Location</label>
                          <span>{txn.merchant_name}</span>
                        </div>
                        <div className="detail-col">
                          <label>Gallons</label>
                          <span>{txn.gallons?.toFixed(1)}</span>
                        </div>
                        <div className="detail-col">
                          <label>Price/Gal</label>
                          <span>{formatCurrency(txn.price_per_gallon)}</span>
                        </div>
                      </div>

                      <div className="anomaly-actions">
                        <button className="btn btn-secondary" onClick={() => setSelectedTransaction(txn)}>
                          <Eye size={16} /> View Details
                        </button>
                        <button className="btn btn-primary" onClick={() => acknowledgeAnomaly(txn.id)}>
                          <CheckCircle size={16} /> Acknowledge
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Transaction Detail Panel */}
      {selectedTransaction && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>Transaction Details</h2>
            <button className="close-btn" onClick={() => setSelectedTransaction(null)}>&times;</button>
          </div>
          <div className="panel-content">
            {selectedTransaction.is_anomaly && (
              <div className="anomaly-alert">
                <AlertTriangle size={20} />
                <div>
                  <strong>Anomaly Detected</strong>
                  <p>{selectedTransaction.anomaly_reason}</p>
                </div>
              </div>
            )}

            <div className="detail-section">
              <h3>Transaction Info</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Date</label>
                  <span>{formatDate(selectedTransaction.transaction_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Time</label>
                  <span>{selectedTransaction.transaction_time || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Total Amount</label>
                  <span className="amount">{formatCurrency(selectedTransaction.total_amount)}</span>
                </div>
                <div className="detail-item">
                  <label>Gallons</label>
                  <span>{selectedTransaction.gallons?.toFixed(2)}</span>
                </div>
                <div className="detail-item">
                  <label>Price/Gallon</label>
                  <span>{formatCurrency(selectedTransaction.price_per_gallon)}</span>
                </div>
                <div className="detail-item">
                  <label>Fuel Type</label>
                  <span>{selectedTransaction.fuel_type}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Vehicle & Driver</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Vehicle</label>
                  <span>{selectedTransaction.vehicle_number}</span>
                </div>
                <div className="detail-item">
                  <label>Driver</label>
                  <span>{selectedTransaction.driver_name}</span>
                </div>
                <div className="detail-item">
                  <label>Odometer</label>
                  <span>{selectedTransaction.odometer_reading?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Calculated MPG</label>
                  <span>{selectedTransaction.calculated_mpg?.toFixed(1) || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Merchant</h3>
              <div className="detail-grid">
                <div className="detail-item full">
                  <label>Name</label>
                  <span>{selectedTransaction.merchant_name}</span>
                </div>
                <div className="detail-item full">
                  <label>Location</label>
                  <span>{selectedTransaction.merchant_location || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Card & Project</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Card Number</label>
                  <span>****{selectedTransaction.card_number?.slice(-4)}</span>
                </div>
                <div className="detail-item">
                  <label>Project</label>
                  <span>{selectedTransaction.project_name}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="panel-actions">
            {selectedTransaction.is_anomaly && !selectedTransaction.anomaly_acknowledged && (
              <button className="btn btn-primary" onClick={() => acknowledgeAnomaly(selectedTransaction.id)}>
                <CheckCircle size={16} /> Acknowledge Anomaly
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => setSelectedTransaction(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FuelManagement;
