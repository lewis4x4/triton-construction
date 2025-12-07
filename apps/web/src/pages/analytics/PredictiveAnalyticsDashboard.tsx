import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';

interface ProjectPrediction {
  id: string;
  project_id: string;
  prediction_type: string;
  predicted_value: number;
  confidence_score: number;
  prediction_date: string;
  target_date: string;
  factors: Record<string, unknown>;
}

interface RiskIndicator {
  id: string;
  project_id: string;
  risk_category: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  indicator_name: string;
  current_value: number;
  threshold_value: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  description: string;
}

interface PredictiveAlert {
  id: string;
  project_id: string;
  alert_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function PredictiveAnalyticsDashboard() {
  const [projects, setProjects] = useState<{ id: string; name: string; project_number: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [predictions, setPredictions] = useState<ProjectPrediction[]>([]);
  const [risks, setRisks] = useState<RiskIndicator[]>([]);
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'cost' | 'safety' | 'equipment'>('overview');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    }
  }, [selectedProjectId]);

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, name, project_number')
      .eq('status', 'ACTIVE')
      .order('name');

    if (data) {
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    }
    setLoading(false);
  }

  async function loadData() {
    setLoading(true);

    const [predictionsRes, risksRes, alertsRes] = await Promise.all([
      supabase
        .from('project_predictions')
        .select('*')
        .eq('project_id', selectedProjectId)
        .order('prediction_date', { ascending: false })
        .limit(20),
      supabase
        .from('risk_indicators')
        .select('*')
        .eq('project_id', selectedProjectId)
        .eq('is_active', true)
        .order('risk_level', { ascending: false }),
      supabase
        .from('predictive_alerts')
        .select('*')
        .eq('project_id', selectedProjectId)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    if (predictionsRes.data) setPredictions(predictionsRes.data);
    if (risksRes.data) setRisks(risksRes.data);
    if (alertsRes.data) setAlerts(alertsRes.data);

    setLoading(false);
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return <span className="text-green-500">↑</span>;
      case 'DECLINING':
        return <span className="text-red-500">↓</span>;
      default:
        return <span className="text-gray-400">→</span>;
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '🚨';
      case 'WARNING':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  const criticalRisks = risks.filter(r => r.risk_level === 'CRITICAL' || r.risk_level === 'HIGH');
  const unreadAlerts = alerts.filter(a => !a.is_read);

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Predictive Analytics</h1>
            <p className="text-gray-600">AI-powered insights and risk predictions</p>
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Alert Banner */}
      {unreadAlerts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-medium text-yellow-800">
                {unreadAlerts.length} new alert{unreadAlerts.length > 1 ? 's' : ''} require attention
              </div>
              <div className="text-sm text-yellow-700">
                {unreadAlerts[0]?.title}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-500">Active Predictions</div>
          <div className="text-2xl font-bold text-gray-900">{predictions.length}</div>
        </div>
        <div className={`p-4 rounded-lg border ${criticalRisks.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className={`text-sm ${criticalRisks.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            High/Critical Risks
          </div>
          <div className={`text-2xl font-bold ${criticalRisks.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {criticalRisks.length}
          </div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-sm text-blue-600">Confidence Score</div>
          <div className="text-2xl font-bold text-blue-700">
            {predictions.length > 0
              ? (predictions.reduce((acc, p) => acc + p.confidence_score, 0) / predictions.length * 100).toFixed(0)
              : 0}%
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-600">Risk Categories</div>
          <div className="text-2xl font-bold text-purple-700">
            {new Set(risks.map(r => r.risk_category)).size}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'schedule', label: 'Schedule' },
            { id: 'cost', label: 'Cost' },
            { id: 'safety', label: 'Safety' },
            { id: 'equipment', label: 'Equipment' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Indicators */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Risk Indicators</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {risks.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    No active risk indicators
                  </div>
                ) : (
                  risks.map((risk) => (
                    <div key={risk.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getRiskColor(risk.risk_level)}`}>
                              {risk.risk_level}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {risk.indicator_name}
                            </span>
                            {getTrendIcon(risk.trend)}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{risk.description}</p>
                          <div className="flex gap-4 mt-2 text-xs text-gray-400">
                            <span>Category: {risk.risk_category}</span>
                            <span>Current: {risk.current_value}</span>
                            <span>Threshold: {risk.threshold_value}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Predictions */}
            <div className="bg-white rounded-lg border border-gray-200 mt-6">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Recent Predictions</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {predictions.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    No predictions available
                  </div>
                ) : (
                  predictions.slice(0, 5).map((prediction) => (
                    <div key={prediction.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {prediction.prediction_type.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-gray-500">
                            Target: {prediction.target_date}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            {prediction.predicted_value.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {(prediction.confidence_score * 100).toFixed(0)}% confidence
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Alerts Sidebar */}
          <div>
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Recent Alerts</h2>
              </div>
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500">
                    No alerts
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`px-4 py-3 ${!alert.is_read ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{getAlertIcon(alert.severity)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">{alert.title}</div>
                          <p className="text-sm text-gray-500 truncate">{alert.message}</p>
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(alert.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 mt-6 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 text-left text-sm bg-gray-50 rounded-lg hover:bg-gray-100">
                  📊 Generate Risk Report
                </button>
                <button className="w-full px-3 py-2 text-left text-sm bg-gray-50 rounded-lg hover:bg-gray-100">
                  📈 Update Predictions
                </button>
                <button className="w-full px-3 py-2 text-left text-sm bg-gray-50 rounded-lg hover:bg-gray-100">
                  🔔 Configure Alerts
                </button>
                <button className="w-full px-3 py-2 text-left text-sm bg-gray-50 rounded-lg hover:bg-gray-100">
                  📥 Export Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PredictiveAnalyticsDashboard;
