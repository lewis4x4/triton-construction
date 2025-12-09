import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  AlertCircle,
  Plus,
  X,
  RefreshCw,
  FileText,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Project {
  id: string;
  name: string;
  project_number: string;
  organization_id: string;
  original_contract_value: number | null;
  current_contract_value: number | null;
}

// Matches database schema: change_order_requests table
interface ChangeOrderRequest {
  id: string;
  cor_number: string;
  title: string;
  description: string;
  change_type: string;
  reason: string | null;
  status: string; // pco_status: IDENTIFIED, PRICING, PRICED, SUBMITTED, APPROVED, etc.
  estimated_cost: number | null;
  estimated_time_impact_days: number | null;
  origination_date: string;
  created_at: string | null;
}

// Matches database schema: change_orders table
interface ChangeOrder {
  id: string;
  change_order_number: string;
  title: string;
  description: string;
  change_type: string;
  status: string; // change_order_status: DRAFT, PENDING_INTERNAL_REVIEW, INTERNAL_APPROVED, etc.
  this_change_amount: number;
  this_time_extension: number | null;
  executed_at: string | null;
  owner_approved_at: string | null;
}

// Matches database schema: time_extension_requests table
interface TimeExtension {
  id: string;
  request_number: string;
  title: string;
  reason: string;
  description: string;
  days_requested: number;
  days_granted: number | null;
  status: string;
  delay_start_date: string;
  created_at: string | null;
}

interface ValidationErrors {
  title?: string;
  description?: string;
  estimated_cost?: string;
  estimated_days?: string;
}

type TabId = 'pcrs' | 'change-orders' | 'time-extensions';

// ============================================================================
// CONSTANTS
// ============================================================================

// Matches database enum: change_order_type
const VALID_CHANGE_TYPES = [
  'OWNER_INITIATED',
  'CONTRACTOR_INITIATED',
  'DESIGN_CHANGE',
  'UNFORESEEN_CONDITIONS',
  'VALUE_ENGINEERING',
  'REGULATORY_REQUIREMENT',
  'FORCE_MAJEURE',
  'CORRECTION',
] as const;

type ChangeOrderType = typeof VALID_CHANGE_TYPES[number];

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_ESTIMATED_COST = 100_000_000; // $100M reasonable limit
const MAX_ESTIMATED_DAYS = 1825; // 5 years

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function sanitizeText(text: string): string {
  // Basic XSS prevention - remove script tags and encode dangerous characters
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

// ============================================================================
// STATUS & PRIORITY BADGE COMPONENTS
// ============================================================================

interface BadgeProps {
  status: string;
}

function StatusBadge({ status }: BadgeProps) {
  // Covers statuses from pco_status, change_order_status, and time extension statuses
  const statusConfig: Record<string, { bg: string; text: string; icon?: React.ElementType }> = {
    // pco_status values
    IDENTIFIED: { bg: 'bg-gray-100', text: 'text-gray-800' },
    PRICING: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
    PRICED: { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: FileText },
    SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-800', icon: FileText },
    APPROVED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    VOID: { bg: 'bg-gray-100', text: 'text-gray-500' },
    INCORPORATED: { bg: 'bg-purple-100', text: 'text-purple-800', icon: CheckCircle },
    // change_order_status values
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800' },
    PENDING_INTERNAL_REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
    INTERNAL_APPROVED: { bg: 'bg-teal-100', text: 'text-teal-800', icon: CheckCircle },
    SUBMITTED_TO_OWNER: { bg: 'bg-blue-100', text: 'text-blue-800', icon: FileText },
    UNDER_NEGOTIATION: { bg: 'bg-orange-100', text: 'text-orange-800', icon: AlertTriangle },
    OWNER_APPROVED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    EXECUTED: { bg: 'bg-purple-100', text: 'text-purple-800', icon: CheckCircle },
    WITHDRAWN: { bg: 'bg-gray-100', text: 'text-gray-500' },
    // Time extension statuses
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
    UNDER_REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
    GRANTED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    DENIED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
  };

  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  const Icon = statusConfig[status]?.icon;
  const displayText = status?.replace(/_/g, ' ') || 'Unknown';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}
      role="status"
      aria-label={`Status: ${displayText}`}
    >
      {Icon && <Icon className="w-3 h-3" aria-hidden="true" />}
      {displayText}
    </span>
  );
}

// ============================================================================
// ERROR BANNER COMPONENT
// ============================================================================

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

function ErrorBanner({ message, onDismiss, onRetry }: ErrorBannerProps) {
  return (
    <div
      className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="text-sm text-red-700 mt-1">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="text-red-600 hover:text-red-800"
          aria-label="Dismiss error"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ChangeOrderDashboard() {
  // State
  const [activeTab, setActiveTab] = useState<TabId>('pcrs');
  const [pcrs, setPcrs] = useState<ChangeOrderRequest[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewPCRForm, setShowNewPCRForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for tracking component mount state
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Derive contract values from selected project (single source of truth)
  const contractValue = useMemo(() => {
    const project = projects.find(p => p.id === selectedProjectId);
    return {
      original: project?.original_contract_value ?? 0,
      current: project?.current_contract_value ?? 0,
    };
  }, [projects, selectedProjectId]);

  // Calculate totals with memoization
  const { totalApprovedChanges, pendingAmount, percentChange, valueMismatch } = useMemo(() => {
    const approved = changeOrders
      .filter(co => co.status === 'OWNER_APPROVED' || co.status === 'EXECUTED')
      .reduce((sum, co) => sum + (co.this_change_amount ?? 0), 0);

    const pending = pcrs
      .filter(pcr => !['APPROVED', 'REJECTED', 'VOID'].includes(pcr.status))
      .reduce((sum, pcr) => sum + (pcr.estimated_cost ?? 0), 0);

    const calculatedCurrent = contractValue.original + approved;
    const mismatch = Math.abs(calculatedCurrent - contractValue.current) > 0.01;

    const pctChange = contractValue.original > 0
      ? (approved / contractValue.original) * 100
      : 0;

    return {
      totalApprovedChanges: approved,
      pendingAmount: pending,
      percentChange: pctChange,
      valueMismatch: mismatch,
    };
  }, [changeOrders, pcrs, contractValue]);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load data when project or tab changes
  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    }
  }, [selectedProjectId, activeTab]);

  const loadProjects = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('id, name, project_number, organization_id, original_contract_value, current_contract_value')
        .in('status', ['ACTIVE', 'MOBILIZATION', 'SUBSTANTIAL_COMPLETION'])
        .order('name');

      if (fetchError) throw new Error(`Failed to load projects: ${fetchError.message}`);

      if (!isMountedRef.current) return;

      if (data && data.length > 0) {
        setProjects(data);
        if (data[0]) {
          setSelectedProjectId(data[0].id);
        }
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
      console.error('loadProjects error:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedProjectId) return;

    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'pcrs') {
        const { data, error: fetchError } = await supabase
          .from('change_order_requests')
          .select('*')
          .eq('project_id', selectedProjectId)
          .order('created_at', { ascending: false });

        if (fetchError) throw new Error(`Failed to load PCRs: ${fetchError.message}`);
        if (!isMountedRef.current) return;
        setPcrs((data as ChangeOrderRequest[]) || []);

      } else if (activeTab === 'change-orders') {
        const { data, error: fetchError } = await supabase
          .from('change_orders')
          .select('*')
          .eq('project_id', selectedProjectId)
          .order('change_order_number', { ascending: false });

        if (fetchError) throw new Error(`Failed to load change orders: ${fetchError.message}`);
        if (!isMountedRef.current) return;
        setChangeOrders((data as ChangeOrder[]) || []);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Failed to load data';
      setError(message);
      console.error('loadData error:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [selectedProjectId, activeTab]);

  const handleProjectChange = useCallback((projectId: string) => {
    setSelectedProjectId(projectId);
    // Clear data to prevent showing stale data during load
    setPcrs([]);
    setChangeOrders([]);
  }, []);

  const tabs = [
    { id: 'pcrs' as const, label: 'Potential Change Requests', icon: FileText },
    { id: 'change-orders' as const, label: 'Change Orders', icon: DollarSign },
    { id: 'time-extensions' as const, label: 'Time Extensions', icon: Clock },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Change Order Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track potential change requests, approved changes, and time extensions
            </p>
          </div>
          <div className="flex gap-3">
            <label htmlFor="project-select" className="sr-only">Select Project</label>
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-describedby="project-help"
            >
              {projects.length === 0 && (
                <option value="">No projects available</option>
              )}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowNewPCRForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
              aria-label="Create new Potential Change Request"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              New PCR
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <ErrorBanner
          message={error}
          onDismiss={() => setError(null)}
          onRetry={loadData}
        />
      )}

      {/* Contract Value Mismatch Warning */}
      {valueMismatch && (
        <div
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" aria-hidden="true" />
            <p className="text-sm text-yellow-700">
              Contract value mismatch detected. Calculated: {formatCurrency(contractValue.original + totalApprovedChanges)},
              Database: {formatCurrency(contractValue.current)}
            </p>
          </div>
        </div>
      )}

      {/* Contract Value Summary */}
      <section
        className="bg-white rounded-lg border border-gray-200 p-4 mb-6"
        aria-label="Contract value summary"
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-sm text-gray-500">Original Contract</div>
            <div className="text-xl font-bold text-gray-900">
              {formatCurrency(contractValue.original)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 flex items-center gap-1">
              Approved Changes
              {totalApprovedChanges >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" aria-hidden="true" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" aria-hidden="true" />
              )}
            </div>
            <div className={`text-xl font-bold ${totalApprovedChanges >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalApprovedChanges >= 0 ? '+' : ''}{formatCurrency(totalApprovedChanges)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Current Contract</div>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(contractValue.original + totalApprovedChanges)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Pending Changes</div>
            <div className="text-xl font-bold text-yellow-600">
              {formatCurrency(pendingAmount)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">% Change</div>
            <div className={`text-xl font-bold ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(percentChange)}
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <nav className="border-b border-gray-200 mb-6" aria-label="Change order tabs">
        <div className="-mb-px flex space-x-8" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab Content */}
      <main>
        {loading ? (
          <div
            className="flex items-center justify-center h-64"
            role="status"
            aria-label="Loading"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true" />
            <span className="sr-only">Loading...</span>
          </div>
        ) : (
          <>
            <div
              id="pcrs-panel"
              role="tabpanel"
              aria-labelledby="pcrs-tab"
              hidden={activeTab !== 'pcrs'}
            >
              {activeTab === 'pcrs' && (
                <PCRList pcrs={pcrs} onRefresh={loadData} />
              )}
            </div>
            <div
              id="change-orders-panel"
              role="tabpanel"
              aria-labelledby="change-orders-tab"
              hidden={activeTab !== 'change-orders'}
            >
              {activeTab === 'change-orders' && (
                <ChangeOrderList changeOrders={changeOrders} />
              )}
            </div>
            <div
              id="time-extensions-panel"
              role="tabpanel"
              aria-labelledby="time-extensions-tab"
              hidden={activeTab !== 'time-extensions'}
            >
              {activeTab === 'time-extensions' && (
                <TimeExtensionsPanel projectId={selectedProjectId} />
              )}
            </div>
          </>
        )}
      </main>

      {/* New PCR Modal */}
      {showNewPCRForm && selectedProjectId && (
        <NewPCRModal
          projectId={selectedProjectId}
          organizationId={projects.find(p => p.id === selectedProjectId)?.organization_id ?? ''}
          onClose={() => setShowNewPCRForm(false)}
          onSave={() => {
            setShowNewPCRForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// PCR LIST COMPONENT
// ============================================================================

interface PCRListProps {
  pcrs: ChangeOrderRequest[];
  onRefresh: () => void;
}

function PCRList({ pcrs, onRefresh }: PCRListProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-medium text-gray-700">
          {pcrs.length} Potential Change Request{pcrs.length !== 1 ? 's' : ''}
        </h2>
        <button
          onClick={onRefresh}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          aria-label="Refresh list"
        >
          <RefreshCw className="w-3 h-3" aria-hidden="true" />
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                COR #
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Title
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Type
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Est. Cost
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Est. Days
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pcrs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" aria-hidden="true" />
                  <p>No potential change requests found</p>
                  <p className="text-sm">Create a new PCR to get started</p>
                </td>
              </tr>
            ) : (
              pcrs.map((pcr) => (
                <tr key={pcr.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">
                    {pcr.cor_number}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{pcr.title}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{pcr.description}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {pcr.change_type?.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(pcr.estimated_cost ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {pcr.estimated_time_impact_days ? `${pcr.estimated_time_impact_days} days` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={pcr.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm focus:outline-none focus:underline"
                      aria-label={`View COR ${pcr.cor_number}`}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// CHANGE ORDER LIST COMPONENT
// ============================================================================

interface ChangeOrderListProps {
  changeOrders: ChangeOrder[];
}

function ChangeOrderList({ changeOrders }: ChangeOrderListProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                CO #
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Title
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Amount
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Time Extension
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Executed Date
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {changeOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-400" aria-hidden="true" />
                  <p>No change orders found</p>
                </td>
              </tr>
            ) : (
              changeOrders.map((co) => (
                <tr key={co.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-blue-600">
                    {co.change_order_number}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900">{co.title}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm font-medium flex items-center gap-1 ${
                        co.this_change_amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {co.this_change_amount >= 0 ? (
                        <TrendingUp className="w-3 h-3" aria-hidden="true" />
                      ) : (
                        <TrendingDown className="w-3 h-3" aria-hidden="true" />
                      )}
                      {co.this_change_amount >= 0 ? '+' : ''}{formatCurrency(co.this_change_amount ?? 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {co.this_time_extension ? (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" aria-hidden="true" />
                        +{co.this_time_extension} days
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={co.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{co.executed_at ?? '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-blue-600 hover:text-blue-800 text-sm focus:outline-none focus:underline"
                      aria-label={`View Change Order ${co.change_order_number}`}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// TIME EXTENSIONS PANEL COMPONENT
// ============================================================================

interface TimeExtensionsPanelProps {
  projectId: string;
}

function TimeExtensionsPanel({ projectId }: TimeExtensionsPanelProps) {
  const [extensions, setExtensions] = useState<TimeExtension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExtensions();
  }, [projectId]);

  async function loadExtensions() {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('time_extension_requests')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(`Failed to load extensions: ${fetchError.message}`);
      setExtensions((data as TimeExtension[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load time extensions';
      setError(message);
      console.error('loadExtensions error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="h-24 bg-gray-100 rounded-lg" />
          <div className="h-24 bg-gray-100 rounded-lg" />
          <div className="h-24 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBanner
        message={error}
        onDismiss={() => setError(null)}
        onRetry={loadExtensions}
      />
    );
  }

  const totalApproved = extensions.reduce((sum, ext) => sum + (ext.days_granted ?? 0), 0);
  const totalPending = extensions
    .filter(ext => ['PENDING', 'UNDER_REVIEW', 'SUBMITTED'].includes(ext.status))
    .reduce((sum, ext) => sum + ext.days_requested, 0);

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" aria-hidden="true" />
            Approved Extensions
          </div>
          <div className="text-2xl font-bold text-green-700">+{totalApproved} days</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 text-sm text-yellow-600">
            <Clock className="w-4 h-4" aria-hidden="true" />
            Pending Extensions
          </div>
          <div className="text-2xl font-bold text-yellow-700">+{totalPending} days</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <FileText className="w-4 h-4" aria-hidden="true" />
            Total Requests
          </div>
          <div className="text-2xl font-bold text-blue-700">{extensions.length}</div>
        </div>
      </div>

      {/* Extensions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Request #
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Title
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Days Requested
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Days Granted
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Delay Start
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {extensions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" aria-hidden="true" />
                    <p>No time extension requests found</p>
                  </td>
                </tr>
              ) : (
                extensions.map((ext) => (
                  <tr key={ext.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      {ext.request_number}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{ext.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">+{ext.days_requested}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">
                      {ext.days_granted !== null ? `+${ext.days_granted}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ext.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ext.delay_start_date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NEW PCR MODAL COMPONENT
// ============================================================================

interface NewPCRModalProps {
  projectId: string;
  organizationId: string;
  onClose: () => void;
  onSave: () => void;
}

function NewPCRModal({ projectId, organizationId, onClose, onSave }: NewPCRModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    change_type: 'OWNER_INITIATED' as ChangeOrderType,
    reason: '',
    estimated_cost: '',
    estimated_days: '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    firstInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Title validation
    const sanitizedTitle = sanitizeText(formData.title);
    if (!sanitizedTitle) {
      newErrors.title = 'Title is required';
    } else if (sanitizedTitle.length > MAX_TITLE_LENGTH) {
      newErrors.title = `Title must be less than ${MAX_TITLE_LENGTH} characters`;
    }

    // Description validation
    const sanitizedDescription = sanitizeText(formData.description);
    if (!sanitizedDescription) {
      newErrors.description = 'Description is required';
    } else if (sanitizedDescription.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`;
    }

    // Estimated cost validation
    if (formData.estimated_cost) {
      const cost = parseFloat(formData.estimated_cost);
      if (isNaN(cost) || cost < 0) {
        newErrors.estimated_cost = 'Cost must be a positive number';
      } else if (cost > MAX_ESTIMATED_COST) {
        newErrors.estimated_cost = `Cost cannot exceed ${formatCurrency(MAX_ESTIMATED_COST)}`;
      }
    }

    // Estimated days validation
    if (formData.estimated_days) {
      const days = parseInt(formData.estimated_days);
      if (isNaN(days) || days < 0) {
        newErrors.estimated_days = 'Days must be a positive number';
      } else if (days > MAX_ESTIMATED_DAYS) {
        newErrors.estimated_days = `Days cannot exceed ${MAX_ESTIMATED_DAYS}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    if (!projectId) {
      setSubmitError('No project selected');
      return;
    }

    if (!organizationId) {
      setSubmitError('Organization not found');
      return;
    }

    setSaving(true);

    try {
      // Generate a COR number (format: COR-YYYYMMDD-XXX)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0] ?? '';
      const dateStr = todayStr.replace(/-/g, '');
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const corNumber = `COR-${dateStr}-${randomSuffix}`;

      const { error } = await supabase.from('change_order_requests').insert({
        organization_id: organizationId,
        project_id: projectId,
        cor_number: corNumber,
        title: sanitizeText(formData.title),
        description: sanitizeText(formData.description),
        change_type: formData.change_type,
        reason: formData.reason || null,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
        estimated_time_impact_days: formData.estimated_days ? parseInt(formData.estimated_days) : null,
        status: 'IDENTIFIED',
        origination_date: todayStr,
      });

      if (error) throw new Error(`Failed to create COR: ${error.message}`);

      onSave();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create PCR';
      setSubmitError(message);
      console.error('handleSubmit error:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="modal-title" className="text-lg font-bold text-gray-900">
            New Potential Change Request
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="pcr-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstInputRef}
              id="pcr-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              maxLength={MAX_TITLE_LENGTH}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
            {errors.title && (
              <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="pcr-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="pcr-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              rows={3}
              maxLength={MAX_DESCRIPTION_LENGTH}
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'description-error' : undefined}
            />
            {errors.description && (
              <p id="description-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pcr-change-type" className="block text-sm font-medium text-gray-700 mb-1">
                Change Type <span className="text-red-500">*</span>
              </label>
              <select
                id="pcr-change-type"
                value={formData.change_type}
                onChange={(e) => setFormData({ ...formData, change_type: e.target.value as ChangeOrderType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="OWNER_INITIATED">Owner Initiated</option>
                <option value="CONTRACTOR_INITIATED">Contractor Initiated</option>
                <option value="DESIGN_CHANGE">Design Change</option>
                <option value="UNFORESEEN_CONDITIONS">Unforeseen Conditions</option>
                <option value="VALUE_ENGINEERING">Value Engineering</option>
                <option value="REGULATORY_REQUIREMENT">Regulatory Requirement</option>
                <option value="FORCE_MAJEURE">Force Majeure</option>
                <option value="CORRECTION">Correction</option>
              </select>
            </div>
            <div>
              <label htmlFor="pcr-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason (Optional)
              </label>
              <input
                id="pcr-reason"
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional context..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pcr-cost" className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Cost ($)
              </label>
              <input
                id="pcr-cost"
                type="number"
                step="0.01"
                min="0"
                max={MAX_ESTIMATED_COST}
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.estimated_cost ? 'border-red-500' : 'border-gray-300'
                }`}
                aria-invalid={!!errors.estimated_cost}
                aria-describedby={errors.estimated_cost ? 'cost-error' : undefined}
              />
              {errors.estimated_cost && (
                <p id="cost-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.estimated_cost}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="pcr-days" className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Days
              </label>
              <input
                id="pcr-days"
                type="number"
                min="0"
                max={MAX_ESTIMATED_DAYS}
                value={formData.estimated_days}
                onChange={(e) => setFormData({ ...formData, estimated_days: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.estimated_days ? 'border-red-500' : 'border-gray-300'
                }`}
                aria-invalid={!!errors.estimated_days}
                aria-describedby={errors.estimated_days ? 'days-error' : undefined}
              />
              {errors.estimated_days && (
                <p id="days-error" className="mt-1 text-sm text-red-600" role="alert">
                  {errors.estimated_days}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
            >
              {saving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" aria-hidden="true" />
              )}
              {saving ? 'Creating...' : 'Create PCR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChangeOrderDashboard;
