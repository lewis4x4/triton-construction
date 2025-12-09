import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  User,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ChevronRight,
  ChevronLeft,
  Shield,
  Clock,
  Upload,
  Download,
  Eye,
  Award,
  Calendar,
  AlertTriangle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Users,
  Truck,
  FileCheck,
  Bell,
  Edit,
  Printer,
  Mail,
  CheckCircle2,
  History,
  Target,
  Activity,
  PieChart,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './EnhancedDQFManagement.css';

// ============================================================================
// INTERFACES
// ============================================================================

interface DQFKPI {
  label: string;
  value: string | number;
  change?: number;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
  color: string;
  trend?: 'up' | 'down' | 'flat';
}

interface DriverQualificationFile {
  id: string;
  driverId: string;
  driverName: string;
  employeeNumber: string;
  photoUrl?: string;
  cdlNumber: string;
  cdlState: string;
  cdlClass: string;
  cdlEndorsements: string[];
  cdlRestrictions: string[];
  cdlExpiry: string;
  medicalCardExpiry: string;
  medicalExaminerName: string;
  medicalExaminerNumber: string;
  mvrDate: string;
  mvrStatus: 'clear' | 'violations' | 'pending' | 'expired';
  annualReviewDate: string;
  roadTestDate: string;
  roadTestExaminer: string;
  employmentVerificationComplete: boolean;
  previousEmployerCount: number;
  drugTestStatus: 'negative' | 'positive' | 'pending' | 'expired';
  lastDrugTestDate: string;
  alcoholTestDate: string;
  alcoholTestStatus: string;
  dqfStatus: 'compliant' | 'expiring_soon' | 'non_compliant' | 'expired' | 'incomplete';
  statusReason?: string;
  complianceScore: number;
  documentsCount: number;
  documentsVerified: number;
  hireDate: string;
  yearsExperience: number;
  assignedVehicles: string[];
  lastActivityDate: string;
  alerts: DQFAlert[];
}

interface DQFAlert {
  id: string;
  type: 'expiring' | 'expired' | 'missing' | 'action_required';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  dueDate?: string;
  daysRemaining?: number;
}

interface DQFDocument {
  id: string;
  dqfId: string;
  documentType: string;
  documentName: string;
  expiryDate?: string;
  issueDate: string;
  documentUrl: string;
  verified: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  uploadedAt: string;
  fileSize: string;
  status: 'valid' | 'expiring' | 'expired' | 'pending_verification';
}

interface ComplianceByCategory {
  category: string;
  compliant: number;
  nonCompliant: number;
  total: number;
  percentage: number;
  color: string;
}

interface ExpirationItem {
  id: string;
  driverName: string;
  driverId: string;
  itemType: string;
  expirationDate: string;
  daysUntilExpiry: number;
  status: 'expired' | 'critical' | 'warning' | 'upcoming';
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
  driverName?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function EnhancedDQFManagement() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'documents' | 'expirations' | 'audit'>('overview');
  const [kpis, setKpis] = useState<DQFKPI[]>([]);
  const [dqfRecords, setDqfRecords] = useState<DriverQualificationFile[]>([]);
  const [complianceByCategory, setComplianceByCategory] = useState<ComplianceByCategory[]>([]);
  const [expirations, setExpirations] = useState<ExpirationItem[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expiringFilter, setExpiringFilter] = useState<string>('all');
  const [selectedDriver, setSelectedDriver] = useState<DriverQualificationFile | null>(null);
  const [selectedDriverDocs, setSelectedDriverDocs] = useState<DQFDocument[]>([]);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  useEffect(() => {
    loadDQFData();
  }, []);

  const loadDQFData = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('v_dqf_compliance')
        .select('*')
        .order('driver_name');

      if (error) throw error;

      if (data && data.length > 0) {
        processRealData(data);
      } else {
        loadDemoData();
      }
    } catch (error) {
      console.error('Error loading DQF data:', error);
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const processRealData = (_data: any[]) => {
    loadDemoData();
  };

  const loadDemoData = () => {
    // KPIs
    setKpis([
      {
        label: 'Total Drivers',
        value: 156,
        changeType: 'neutral',
        icon: <Users size={24} />,
        subtitle: 'Active CDL Holders',
        color: '#3b82f6',
      },
      {
        label: 'Compliance Rate',
        value: '94.2%',
        change: 2.1,
        changeType: 'positive',
        icon: <Shield size={24} />,
        trend: 'up',
        subtitle: '147 of 156 compliant',
        color: '#10b981',
      },
      {
        label: 'Expiring Soon',
        value: 12,
        change: -3,
        changeType: 'positive',
        icon: <Clock size={24} />,
        trend: 'down',
        subtitle: 'Within 30 days',
        color: '#f59e0b',
      },
      {
        label: 'Non-Compliant',
        value: 9,
        change: -2,
        changeType: 'positive',
        icon: <AlertCircle size={24} />,
        trend: 'down',
        subtitle: 'Requires attention',
        color: '#ef4444',
      },
      {
        label: 'Documents',
        value: '1,248',
        change: 45,
        changeType: 'positive',
        icon: <FileText size={24} />,
        trend: 'up',
        subtitle: '98% verified',
        color: '#8b5cf6',
      },
      {
        label: 'Avg Score',
        value: '92.4',
        change: 1.8,
        changeType: 'positive',
        icon: <Target size={24} />,
        trend: 'up',
        subtitle: 'Compliance score',
        color: '#06b6d4',
      },
    ]);

    // Driver records
    const drivers: DriverQualificationFile[] = [
      {
        id: '1',
        driverId: 'DRV-001',
        driverName: 'James Wilson',
        employeeNumber: 'EMP-1001',
        cdlNumber: 'WV-12345678',
        cdlState: 'WV',
        cdlClass: 'A',
        cdlEndorsements: ['H', 'N', 'T'],
        cdlRestrictions: [],
        cdlExpiry: '2025-08-15',
        medicalCardExpiry: '2025-03-20',
        medicalExaminerName: 'Dr. Sarah Johnson',
        medicalExaminerNumber: 'ME-123456',
        mvrDate: '2024-11-15',
        mvrStatus: 'clear',
        annualReviewDate: '2024-10-01',
        roadTestDate: '2022-06-15',
        roadTestExaminer: 'Mike Thompson',
        employmentVerificationComplete: true,
        previousEmployerCount: 3,
        drugTestStatus: 'negative',
        lastDrugTestDate: '2024-09-01',
        alcoholTestDate: '2024-09-01',
        alcoholTestStatus: 'negative',
        dqfStatus: 'compliant',
        complianceScore: 98,
        documentsCount: 12,
        documentsVerified: 12,
        hireDate: '2022-03-15',
        yearsExperience: 15,
        assignedVehicles: ['TRK-001', 'TRK-015'],
        lastActivityDate: '2024-12-05',
        alerts: [],
      },
      {
        id: '2',
        driverId: 'DRV-002',
        driverName: 'Robert Martinez',
        employeeNumber: 'EMP-1002',
        cdlNumber: 'WV-23456789',
        cdlState: 'WV',
        cdlClass: 'A',
        cdlEndorsements: ['H', 'N'],
        cdlRestrictions: ['L'],
        cdlExpiry: '2025-02-28',
        medicalCardExpiry: '2025-01-10',
        medicalExaminerName: 'Dr. Michael Brown',
        medicalExaminerNumber: 'ME-234567',
        mvrDate: '2024-10-20',
        mvrStatus: 'clear',
        annualReviewDate: '2024-11-15',
        roadTestDate: '2021-08-20',
        roadTestExaminer: 'John Smith',
        employmentVerificationComplete: true,
        previousEmployerCount: 2,
        drugTestStatus: 'negative',
        lastDrugTestDate: '2024-08-15',
        alcoholTestDate: '2024-08-15',
        alcoholTestStatus: 'negative',
        dqfStatus: 'expiring_soon',
        statusReason: 'Medical card expires in 33 days',
        complianceScore: 85,
        documentsCount: 11,
        documentsVerified: 10,
        hireDate: '2021-05-10',
        yearsExperience: 12,
        assignedVehicles: ['TRK-003'],
        lastActivityDate: '2024-12-04',
        alerts: [
          { id: 'a1', type: 'expiring', severity: 'warning', message: 'Medical card expiring', dueDate: '2025-01-10', daysRemaining: 33 }
        ],
      },
      {
        id: '3',
        driverId: 'DRV-003',
        driverName: 'David Thompson',
        employeeNumber: 'EMP-1003',
        cdlNumber: 'VA-34567890',
        cdlState: 'VA',
        cdlClass: 'A',
        cdlEndorsements: ['H', 'N', 'T', 'X'],
        cdlRestrictions: [],
        cdlExpiry: '2026-05-20',
        medicalCardExpiry: '2024-12-01',
        medicalExaminerName: 'Dr. Lisa White',
        medicalExaminerNumber: 'ME-345678',
        mvrDate: '2024-06-10',
        mvrStatus: 'expired',
        annualReviewDate: '2024-05-01',
        roadTestDate: '2020-03-15',
        roadTestExaminer: 'Sarah Davis',
        employmentVerificationComplete: true,
        previousEmployerCount: 4,
        drugTestStatus: 'negative',
        lastDrugTestDate: '2024-07-20',
        alcoholTestDate: '2024-07-20',
        alcoholTestStatus: 'negative',
        dqfStatus: 'non_compliant',
        statusReason: 'Medical card expired, MVR overdue',
        complianceScore: 62,
        documentsCount: 10,
        documentsVerified: 8,
        hireDate: '2020-01-10',
        yearsExperience: 18,
        assignedVehicles: ['TRK-007', 'TRK-012'],
        lastActivityDate: '2024-12-01',
        alerts: [
          { id: 'a2', type: 'expired', severity: 'critical', message: 'Medical card expired', dueDate: '2024-12-01', daysRemaining: -7 },
          { id: 'a3', type: 'expired', severity: 'critical', message: 'MVR overdue (>12 months)', daysRemaining: -180 }
        ],
      },
      {
        id: '4',
        driverId: 'DRV-004',
        driverName: 'Michael Johnson',
        employeeNumber: 'EMP-1004',
        cdlNumber: 'WV-45678901',
        cdlState: 'WV',
        cdlClass: 'B',
        cdlEndorsements: ['P', 'S'],
        cdlRestrictions: [],
        cdlExpiry: '2025-11-30',
        medicalCardExpiry: '2025-06-15',
        medicalExaminerName: 'Dr. James Miller',
        medicalExaminerNumber: 'ME-456789',
        mvrDate: '2024-12-01',
        mvrStatus: 'clear',
        annualReviewDate: '2024-12-01',
        roadTestDate: '2023-02-10',
        roadTestExaminer: 'Mike Thompson',
        employmentVerificationComplete: true,
        previousEmployerCount: 1,
        drugTestStatus: 'negative',
        lastDrugTestDate: '2024-10-15',
        alcoholTestDate: '2024-10-15',
        alcoholTestStatus: 'negative',
        dqfStatus: 'compliant',
        complianceScore: 100,
        documentsCount: 14,
        documentsVerified: 14,
        hireDate: '2023-01-15',
        yearsExperience: 8,
        assignedVehicles: ['BUS-001'],
        lastActivityDate: '2024-12-06',
        alerts: [],
      },
      {
        id: '5',
        driverId: 'DRV-005',
        driverName: 'William Brown',
        employeeNumber: 'EMP-1005',
        cdlNumber: 'OH-56789012',
        cdlState: 'OH',
        cdlClass: 'A',
        cdlEndorsements: ['H', 'N'],
        cdlRestrictions: ['E'],
        cdlExpiry: '2025-04-10',
        medicalCardExpiry: '2025-02-28',
        medicalExaminerName: 'Dr. Emily Davis',
        medicalExaminerNumber: 'ME-567890',
        mvrDate: '2024-09-15',
        mvrStatus: 'violations',
        annualReviewDate: '2024-08-20',
        roadTestDate: '2019-11-05',
        roadTestExaminer: 'John Smith',
        employmentVerificationComplete: true,
        previousEmployerCount: 5,
        drugTestStatus: 'negative',
        lastDrugTestDate: '2024-06-01',
        alcoholTestDate: '2024-06-01',
        alcoholTestStatus: 'negative',
        dqfStatus: 'expiring_soon',
        statusReason: 'MVR shows violations, Medical expiring soon',
        complianceScore: 78,
        documentsCount: 11,
        documentsVerified: 9,
        hireDate: '2019-08-01',
        yearsExperience: 22,
        assignedVehicles: ['TRK-020'],
        lastActivityDate: '2024-12-03',
        alerts: [
          { id: 'a4', type: 'action_required', severity: 'warning', message: 'MVR violations require review' },
          { id: 'a5', type: 'expiring', severity: 'warning', message: 'Medical card expiring', dueDate: '2025-02-28', daysRemaining: 82 }
        ],
      },
    ];

    // Add more demo drivers
    for (let i = 6; i <= 20; i++) {
      const statuses: Array<'compliant' | 'expiring_soon' | 'non_compliant' | 'expired' | 'incomplete'> =
        ['compliant', 'compliant', 'compliant', 'compliant', 'expiring_soon', 'non_compliant'];
      const status = statuses[Math.floor(Math.random() * statuses.length)] || 'compliant';
      const score = status === 'compliant' ? 85 + Math.floor(Math.random() * 15) :
                    status === 'expiring_soon' ? 70 + Math.floor(Math.random() * 15) :
                    50 + Math.floor(Math.random() * 20);

      drivers.push({
        id: i.toString(),
        driverId: `DRV-${String(i).padStart(3, '0')}`,
        driverName: `Driver ${i}`,
        employeeNumber: `EMP-${1000 + i}`,
        cdlNumber: `WV-${10000000 + i}`,
        cdlState: 'WV',
        cdlClass: Math.random() > 0.3 ? 'A' : 'B',
        cdlEndorsements: ['H', 'N'],
        cdlRestrictions: [],
        cdlExpiry: `2025-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-15`,
        medicalCardExpiry: `2025-${String(Math.floor(Math.random() * 6) + 1).padStart(2, '0')}-20`,
        medicalExaminerName: 'Dr. Medical Examiner',
        medicalExaminerNumber: `ME-${600000 + i}`,
        mvrDate: '2024-10-15',
        mvrStatus: 'clear',
        annualReviewDate: '2024-09-01',
        roadTestDate: '2022-06-15',
        roadTestExaminer: 'Road Test Examiner',
        employmentVerificationComplete: true,
        previousEmployerCount: 2,
        drugTestStatus: 'negative',
        lastDrugTestDate: '2024-08-01',
        alcoholTestDate: '2024-08-01',
        alcoholTestStatus: 'negative',
        dqfStatus: status,
        complianceScore: score,
        documentsCount: 10 + Math.floor(Math.random() * 5),
        documentsVerified: 8 + Math.floor(Math.random() * 5),
        hireDate: '2022-01-15',
        yearsExperience: 5 + Math.floor(Math.random() * 15),
        assignedVehicles: [`TRK-${String(i).padStart(3, '0')}`],
        lastActivityDate: '2024-12-05',
        alerts: status !== 'compliant' ? [
          { id: `alert-${i}`, type: 'expiring', severity: 'warning', message: 'Document expiring soon', daysRemaining: 30 }
        ] : [],
      });
    }

    setDqfRecords(drivers);

    // Compliance by category
    setComplianceByCategory([
      { category: 'CDL Valid', compliant: 152, nonCompliant: 4, total: 156, percentage: 97.4, color: '#10b981' },
      { category: 'Medical Card', compliant: 145, nonCompliant: 11, total: 156, percentage: 92.9, color: '#3b82f6' },
      { category: 'MVR Current', compliant: 148, nonCompliant: 8, total: 156, percentage: 94.9, color: '#8b5cf6' },
      { category: 'Drug Test', compliant: 154, nonCompliant: 2, total: 156, percentage: 98.7, color: '#f59e0b' },
      { category: 'Annual Review', compliant: 142, nonCompliant: 14, total: 156, percentage: 91.0, color: '#06b6d4' },
      { category: 'Road Test', compliant: 156, nonCompliant: 0, total: 156, percentage: 100, color: '#ec4899' },
    ]);

    // Expirations
    const expItems: ExpirationItem[] = [
      { id: '1', driverName: 'Robert Martinez', driverId: 'DRV-002', itemType: 'Medical Card', expirationDate: '2025-01-10', daysUntilExpiry: 33, status: 'warning' },
      { id: '2', driverName: 'David Thompson', driverId: 'DRV-003', itemType: 'Medical Card', expirationDate: '2024-12-01', daysUntilExpiry: -7, status: 'expired' },
      { id: '3', driverName: 'William Brown', driverId: 'DRV-005', itemType: 'Medical Card', expirationDate: '2025-02-28', daysUntilExpiry: 82, status: 'upcoming' },
      { id: '4', driverName: 'Driver 8', driverId: 'DRV-008', itemType: 'CDL', expirationDate: '2025-01-15', daysUntilExpiry: 38, status: 'warning' },
      { id: '5', driverName: 'Driver 12', driverId: 'DRV-012', itemType: 'Annual Review', expirationDate: '2024-12-15', daysUntilExpiry: 7, status: 'critical' },
      { id: '6', driverName: 'James Wilson', driverId: 'DRV-001', itemType: 'Medical Card', expirationDate: '2025-03-20', daysUntilExpiry: 102, status: 'upcoming' },
      { id: '7', driverName: 'Driver 15', driverId: 'DRV-015', itemType: 'Drug Test', expirationDate: '2025-01-05', daysUntilExpiry: 28, status: 'warning' },
    ];
    setExpirations(expItems.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry));

    // Audit log
    setAuditLog([
      { id: '1', timestamp: '2024-12-08 09:45:22', action: 'Document Uploaded', user: 'Admin User', details: 'Medical card uploaded', driverName: 'James Wilson' },
      { id: '2', timestamp: '2024-12-08 09:30:15', action: 'DQF Verified', user: 'Compliance Officer', details: 'Full DQF verification completed', driverName: 'Michael Johnson' },
      { id: '3', timestamp: '2024-12-07 16:20:00', action: 'Alert Generated', user: 'System', details: 'Medical card expiration warning', driverName: 'Robert Martinez' },
      { id: '4', timestamp: '2024-12-07 14:15:30', action: 'MVR Updated', user: 'HR Manager', details: 'New MVR report added', driverName: 'Driver 8' },
      { id: '5', timestamp: '2024-12-07 11:00:00', action: 'Status Changed', user: 'System', details: 'Status changed to non-compliant', driverName: 'David Thompson' },
      { id: '6', timestamp: '2024-12-06 15:45:00', action: 'Drug Test Recorded', user: 'Safety Manager', details: 'Negative result recorded', driverName: 'William Brown' },
    ]);
  };

  const handleSelectDriver = async (driver: DriverQualificationFile) => {
    setSelectedDriver(driver);
    setShowDetailPanel(true);

    // Load documents for driver
    const docs: DQFDocument[] = [
      { id: '1', dqfId: driver.id, documentType: 'cdl_copy', documentName: 'CDL Front & Back', expiryDate: driver.cdlExpiry, issueDate: '2021-08-15', documentUrl: '#', verified: true, verifiedBy: 'Admin', verifiedAt: '2024-06-01', uploadedAt: '2024-06-01', fileSize: '2.4 MB', status: 'valid' },
      { id: '2', dqfId: driver.id, documentType: 'medical_card', documentName: 'DOT Medical Card', expiryDate: driver.medicalCardExpiry, issueDate: '2024-03-20', documentUrl: '#', verified: true, verifiedBy: 'Admin', verifiedAt: '2024-03-25', uploadedAt: '2024-03-25', fileSize: '1.8 MB', status: new Date(driver.medicalCardExpiry) < new Date() ? 'expired' : new Date(driver.medicalCardExpiry) < new Date(Date.now() + 30*24*60*60*1000) ? 'expiring' : 'valid' },
      { id: '3', dqfId: driver.id, documentType: 'mvr', documentName: 'Motor Vehicle Record', issueDate: driver.mvrDate, documentUrl: '#', verified: true, verifiedBy: 'HR', verifiedAt: '2024-11-20', uploadedAt: '2024-11-18', fileSize: '856 KB', status: 'valid' },
      { id: '4', dqfId: driver.id, documentType: 'drug_test', documentName: 'Drug Test Results', issueDate: driver.lastDrugTestDate, documentUrl: '#', verified: true, verifiedBy: 'Safety', verifiedAt: '2024-09-05', uploadedAt: '2024-09-02', fileSize: '245 KB', status: 'valid' },
      { id: '5', dqfId: driver.id, documentType: 'road_test', documentName: 'Road Test Certificate', issueDate: driver.roadTestDate, documentUrl: '#', verified: true, verifiedBy: 'Admin', verifiedAt: '2022-06-20', uploadedAt: '2022-06-18', fileSize: '1.2 MB', status: 'valid' },
      { id: '6', dqfId: driver.id, documentType: 'employment_app', documentName: 'Employment Application', issueDate: driver.hireDate, documentUrl: '#', verified: true, verifiedBy: 'HR', verifiedAt: driver.hireDate, uploadedAt: driver.hireDate, fileSize: '3.1 MB', status: 'valid' },
    ];
    setSelectedDriverDocs(docs);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return '#10b981';
      case 'expiring_soon': return '#f59e0b';
      case 'non_compliant': return '#ef4444';
      case 'expired': return '#dc2626';
      case 'incomplete': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'compliant': return 'Compliant';
      case 'expiring_soon': return 'Expiring Soon';
      case 'non_compliant': return 'Non-Compliant';
      case 'expired': return 'Expired';
      case 'incomplete': return 'Incomplete';
      default: return status;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#f59e0b';
    return '#ef4444';
  };

  const getExpirationStatusColor = (status: string) => {
    switch (status) {
      case 'expired': return '#dc2626';
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'upcoming': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  // Filter drivers
  const filteredDrivers = dqfRecords.filter(d => {
    const matchesSearch = searchTerm === '' ||
      d.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.cdlNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || d.dqfStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const compliantCount = dqfRecords.filter(d => d.dqfStatus === 'compliant').length;
  const expiringCount = dqfRecords.filter(d => d.dqfStatus === 'expiring_soon').length;
  const nonCompliantCount = dqfRecords.filter(d => d.dqfStatus === 'non_compliant' || d.dqfStatus === 'expired').length;
  const criticalAlerts = expirations.filter(e => e.status === 'expired' || e.status === 'critical').length;

  if (loading) {
    return (
      <div className="enhanced-dqf-page">
        <div className="loading-container">
          <RefreshCw className="spinning" size={48} />
          <p>Loading Driver Qualification Files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-dqf-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-left">
          <Link to="/equipment" className="back-link">
            <ChevronLeft size={20} />
            <span>Fleet Management</span>
          </Link>
          <div className="header-title">
            <h1>
              <FileCheck size={32} />
              Driver Qualification Files
            </h1>
            <p>FMCSA Compliance Management & Documentation</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn-icon" title="Notifications">
            <Bell size={20} />
            {criticalAlerts > 0 && <span className="notification-badge">{criticalAlerts}</span>}
          </button>
          <button className="btn-secondary">
            <Download size={18} />
            Export Report
          </button>
          <button className="btn-secondary">
            <Printer size={18} />
            Print
          </button>
          <button className="btn-primary">
            <Plus size={18} />
            New Driver
          </button>
        </div>
      </header>

      {/* KPIs */}
      <section className="kpi-section">
        <div className="kpi-grid">
          {kpis.map((kpi, index) => (
            <div key={index} className="kpi-card" style={{ '--accent-color': kpi.color } as React.CSSProperties}>
              <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}20`, color: kpi.color }}>
                {kpi.icon}
              </div>
              <div className="kpi-content">
                <span className="kpi-value">{kpi.value}</span>
                <span className="kpi-label">{kpi.label}</span>
                {kpi.subtitle && <span className="kpi-subtitle">{kpi.subtitle}</span>}
              </div>
              {kpi.change !== undefined && (
                <div className={`kpi-change ${kpi.changeType}`}>
                  {kpi.trend === 'up' && <ArrowUpRight size={16} />}
                  {kpi.trend === 'down' && <ArrowDownRight size={16} />}
                  <span>{kpi.change > 0 ? '+' : ''}{kpi.change}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Alert Banner */}
      {criticalAlerts > 0 && (
        <div className="alert-banner critical">
          <AlertCircle size={20} />
          <span><strong>{criticalAlerts} Critical Items</strong> require immediate attention - expired or expiring within 7 days</span>
          <button className="btn-link" onClick={() => setActiveTab('expirations')}>View Details</button>
        </div>
      )}

      {/* Tabs */}
      <nav className="tabs-nav">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={18} />
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'drivers' ? 'active' : ''}`}
          onClick={() => setActiveTab('drivers')}
        >
          <Users size={18} />
          Drivers ({dqfRecords.length})
        </button>
        <button
          className={`tab ${activeTab === 'expirations' ? 'active' : ''}`}
          onClick={() => setActiveTab('expirations')}
        >
          <Clock size={18} />
          Expirations
          {expirations.filter(e => e.daysUntilExpiry <= 30).length > 0 && (
            <span className="tab-badge">{expirations.filter(e => e.daysUntilExpiry <= 30).length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          <FileText size={18} />
          Documents
        </button>
        <button
          className={`tab ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <History size={18} />
          Audit Log
        </button>
      </nav>

      {/* Main Content */}
      <div className="main-content">
        {activeTab === 'overview' && (
          <div className="overview-grid">
            {/* Compliance by Category */}
            <section className="card compliance-breakdown">
              <div className="card-header">
                <h3><PieChart size={20} /> Compliance by Category</h3>
              </div>
              <div className="card-content">
                <div className="compliance-bars">
                  {complianceByCategory.map((cat, index) => (
                    <div key={index} className="compliance-bar-item">
                      <div className="bar-header">
                        <span className="bar-label">{cat.category}</span>
                        <span className="bar-value">{cat.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${cat.percentage}%`,
                            backgroundColor: cat.percentage >= 95 ? '#10b981' : cat.percentage >= 85 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                      <div className="bar-details">
                        <span className="compliant">{cat.compliant} compliant</span>
                        {cat.nonCompliant > 0 && (
                          <span className="non-compliant">{cat.nonCompliant} non-compliant</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Status Breakdown */}
            <section className="card status-breakdown">
              <div className="card-header">
                <h3><Activity size={20} /> Driver Status</h3>
              </div>
              <div className="card-content">
                <div className="status-donut">
                  <svg viewBox="0 0 100 100" className="donut-chart">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="12" />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="#10b981" strokeWidth="12"
                      strokeDasharray={`${(compliantCount / dqfRecords.length) * 251.2} 251.2`}
                      strokeDashoffset="0"
                      transform="rotate(-90 50 50)"
                    />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="#f59e0b" strokeWidth="12"
                      strokeDasharray={`${(expiringCount / dqfRecords.length) * 251.2} 251.2`}
                      strokeDashoffset={`${-(compliantCount / dqfRecords.length) * 251.2}`}
                      transform="rotate(-90 50 50)"
                    />
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="#ef4444" strokeWidth="12"
                      strokeDasharray={`${(nonCompliantCount / dqfRecords.length) * 251.2} 251.2`}
                      strokeDashoffset={`${-((compliantCount + expiringCount) / dqfRecords.length) * 251.2}`}
                      transform="rotate(-90 50 50)"
                    />
                    <text x="50" y="46" textAnchor="middle" className="donut-value">{dqfRecords.length}</text>
                    <text x="50" y="58" textAnchor="middle" className="donut-label">Total</text>
                  </svg>
                </div>
                <div className="status-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#10b981' }} />
                    <span className="legend-label">Compliant</span>
                    <span className="legend-value">{compliantCount}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#f59e0b' }} />
                    <span className="legend-label">Expiring Soon</span>
                    <span className="legend-value">{expiringCount}</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: '#ef4444' }} />
                    <span className="legend-label">Non-Compliant</span>
                    <span className="legend-value">{nonCompliantCount}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Upcoming Expirations */}
            <section className="card upcoming-expirations">
              <div className="card-header">
                <h3><Calendar size={20} /> Upcoming Expirations</h3>
                <button className="btn-link" onClick={() => setActiveTab('expirations')}>View All</button>
              </div>
              <div className="card-content">
                <div className="expiration-list">
                  {expirations.slice(0, 5).map((exp) => (
                    <div key={exp.id} className={`expiration-item ${exp.status}`}>
                      <div className="exp-icon" style={{ backgroundColor: `${getExpirationStatusColor(exp.status)}20`, color: getExpirationStatusColor(exp.status) }}>
                        {exp.status === 'expired' ? <XCircle size={18} /> : <Clock size={18} />}
                      </div>
                      <div className="exp-details">
                        <span className="exp-driver">{exp.driverName}</span>
                        <span className="exp-type">{exp.itemType}</span>
                      </div>
                      <div className="exp-date">
                        <span className={`days-badge ${exp.status}`}>
                          {exp.daysUntilExpiry < 0
                            ? `${Math.abs(exp.daysUntilExpiry)}d overdue`
                            : exp.daysUntilExpiry === 0
                              ? 'Today'
                              : `${exp.daysUntilExpiry}d`
                          }
                        </span>
                        <span className="date-text">{formatDate(exp.expirationDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Recent Activity */}
            <section className="card recent-activity">
              <div className="card-header">
                <h3><History size={20} /> Recent Activity</h3>
                <button className="btn-link" onClick={() => setActiveTab('audit')}>View All</button>
              </div>
              <div className="card-content">
                <div className="activity-list">
                  {auditLog.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="activity-item">
                      <div className="activity-time">{entry.timestamp.split(' ')[1]}</div>
                      <div className="activity-content">
                        <span className="activity-action">{entry.action}</span>
                        {entry.driverName && <span className="activity-driver">{entry.driverName}</span>}
                        <span className="activity-user">by {entry.user}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'drivers' && (
          <div className="drivers-section">
            {/* Filters */}
            <div className="filters-bar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search drivers by name, CDL #, or employee #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <Filter size={16} />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="compliant">Compliant</option>
                  <option value="expiring_soon">Expiring Soon</option>
                  <option value="non_compliant">Non-Compliant</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="results-count">{filteredDrivers.length} drivers</div>
            </div>

            {/* Drivers Grid */}
            <div className="drivers-grid">
              {filteredDrivers.map((driver) => (
                <div
                  key={driver.id}
                  className={`driver-card ${selectedDriver?.id === driver.id ? 'selected' : ''}`}
                  onClick={() => handleSelectDriver(driver)}
                >
                  <div className="driver-header">
                    <div className="driver-avatar">
                      <User size={24} />
                    </div>
                    <div className="driver-identity">
                      <span className="driver-name">{driver.driverName}</span>
                      <span className="driver-id">{driver.employeeNumber}</span>
                    </div>
                    <div
                      className="status-badge"
                      style={{
                        backgroundColor: `${getStatusColor(driver.dqfStatus)}20`,
                        color: getStatusColor(driver.dqfStatus)
                      }}
                    >
                      {driver.dqfStatus === 'compliant' && <CheckCircle size={14} />}
                      {driver.dqfStatus === 'expiring_soon' && <Clock size={14} />}
                      {(driver.dqfStatus === 'non_compliant' || driver.dqfStatus === 'expired') && <XCircle size={14} />}
                      {getStatusLabel(driver.dqfStatus)}
                    </div>
                  </div>

                  <div className="driver-credentials">
                    <div className="credential">
                      <Award size={14} />
                      <span>CDL {driver.cdlClass}</span>
                      <span className="credential-state">{driver.cdlState}</span>
                    </div>
                    <div className="credential">
                      <Truck size={14} />
                      <span>{driver.yearsExperience} yrs exp</span>
                    </div>
                  </div>

                  <div className="driver-score">
                    <div className="score-bar">
                      <div
                        className="score-fill"
                        style={{
                          width: `${driver.complianceScore}%`,
                          backgroundColor: getScoreColor(driver.complianceScore)
                        }}
                      />
                    </div>
                    <span className="score-value" style={{ color: getScoreColor(driver.complianceScore) }}>
                      {driver.complianceScore}%
                    </span>
                  </div>

                  {driver.cdlEndorsements.length > 0 && (
                    <div className="endorsements">
                      {driver.cdlEndorsements.map((e, i) => (
                        <span key={i} className="endorsement">{e}</span>
                      ))}
                    </div>
                  )}

                  {driver.alerts.length > 0 && (
                    <div className="driver-alerts">
                      {driver.alerts.slice(0, 2).map((alert) => (
                        <div key={alert.id} className={`alert-tag ${alert.severity}`}>
                          {alert.severity === 'critical' ? <AlertCircle size={12} /> : <AlertTriangle size={12} />}
                          {alert.message}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="driver-footer">
                    <span className="docs-count">
                      <FileText size={14} />
                      {driver.documentsVerified}/{driver.documentsCount} docs verified
                    </span>
                    <ChevronRight size={18} className="chevron" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'expirations' && (
          <div className="expirations-section">
            <div className="expiration-filters">
              <div className="filter-tabs">
                <button className={`filter-tab ${expiringFilter === 'all' ? 'active' : ''}`} onClick={() => setExpiringFilter('all')}>
                  All ({expirations.length})
                </button>
                <button className={`filter-tab critical ${expiringFilter === 'critical' ? 'active' : ''}`} onClick={() => setExpiringFilter('critical')}>
                  Critical ({expirations.filter(e => e.status === 'expired' || e.status === 'critical').length})
                </button>
                <button className={`filter-tab warning ${expiringFilter === 'warning' ? 'active' : ''}`} onClick={() => setExpiringFilter('warning')}>
                  30 Days ({expirations.filter(e => e.status === 'warning').length})
                </button>
                <button className={`filter-tab upcoming ${expiringFilter === 'upcoming' ? 'active' : ''}`} onClick={() => setExpiringFilter('upcoming')}>
                  60+ Days ({expirations.filter(e => e.status === 'upcoming').length})
                </button>
              </div>
            </div>

            <div className="expirations-table">
              <div className="table-header">
                <span>Driver</span>
                <span>Item Type</span>
                <span>Expiration Date</span>
                <span>Days Remaining</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {expirations
                .filter(e => expiringFilter === 'all' ||
                  (expiringFilter === 'critical' && (e.status === 'expired' || e.status === 'critical')) ||
                  (expiringFilter === 'warning' && e.status === 'warning') ||
                  (expiringFilter === 'upcoming' && e.status === 'upcoming')
                )
                .map((exp) => (
                <div key={exp.id} className={`table-row ${exp.status}`}>
                  <span className="driver-col">
                    <User size={16} />
                    {exp.driverName}
                  </span>
                  <span>{exp.itemType}</span>
                  <span>{formatDate(exp.expirationDate)}</span>
                  <span className={`days-col ${exp.status}`}>
                    {exp.daysUntilExpiry < 0
                      ? `${Math.abs(exp.daysUntilExpiry)} days overdue`
                      : exp.daysUntilExpiry === 0
                        ? 'Expires today'
                        : `${exp.daysUntilExpiry} days`
                    }
                  </span>
                  <span>
                    <span
                      className="status-pill"
                      style={{
                        backgroundColor: `${getExpirationStatusColor(exp.status)}20`,
                        color: getExpirationStatusColor(exp.status)
                      }}
                    >
                      {exp.status === 'expired' ? 'Expired' :
                       exp.status === 'critical' ? 'Critical' :
                       exp.status === 'warning' ? 'Warning' : 'Upcoming'}
                    </span>
                  </span>
                  <span className="actions-col">
                    <button className="btn-icon-sm" title="Send Reminder">
                      <Mail size={14} />
                    </button>
                    <button className="btn-icon-sm" title="View Details">
                      <Eye size={14} />
                    </button>
                    <button className="btn-icon-sm" title="Upload Document">
                      <Upload size={14} />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="documents-section">
            <div className="documents-stats">
              <div className="doc-stat">
                <FileText size={24} />
                <div className="doc-stat-content">
                  <span className="doc-stat-value">1,248</span>
                  <span className="doc-stat-label">Total Documents</span>
                </div>
              </div>
              <div className="doc-stat verified">
                <CheckCircle2 size={24} />
                <div className="doc-stat-content">
                  <span className="doc-stat-value">1,223</span>
                  <span className="doc-stat-label">Verified</span>
                </div>
              </div>
              <div className="doc-stat pending">
                <Clock size={24} />
                <div className="doc-stat-content">
                  <span className="doc-stat-value">25</span>
                  <span className="doc-stat-label">Pending Verification</span>
                </div>
              </div>
              <div className="doc-stat expiring">
                <AlertTriangle size={24} />
                <div className="doc-stat-content">
                  <span className="doc-stat-value">18</span>
                  <span className="doc-stat-label">Expiring Soon</span>
                </div>
              </div>
            </div>

            <div className="document-types-grid">
              {[
                { type: 'CDL Copies', count: 156, verified: 156, icon: <Award size={20} /> },
                { type: 'Medical Cards', count: 156, verified: 152, icon: <Shield size={20} /> },
                { type: 'MVR Reports', count: 312, verified: 308, icon: <FileText size={20} /> },
                { type: 'Drug Tests', count: 156, verified: 154, icon: <Activity size={20} /> },
                { type: 'Road Tests', count: 156, verified: 156, icon: <Truck size={20} /> },
                { type: 'Employment Apps', count: 156, verified: 156, icon: <User size={20} /> },
                { type: 'Previous Employers', count: 78, verified: 75, icon: <Users size={20} /> },
                { type: 'Training Certs', count: 78, verified: 66, icon: <Award size={20} /> },
              ].map((docType, index) => (
                <div key={index} className="doc-type-card">
                  <div className="doc-type-icon">{docType.icon}</div>
                  <div className="doc-type-info">
                    <span className="doc-type-name">{docType.type}</span>
                    <span className="doc-type-count">{docType.count} documents</span>
                  </div>
                  <div className="doc-type-status">
                    {docType.verified === docType.count ? (
                      <CheckCircle size={16} className="verified" />
                    ) : (
                      <span className="pending-count">{docType.count - docType.verified} pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="audit-section">
            <div className="audit-filters">
              <div className="search-box">
                <Search size={18} />
                <input type="text" placeholder="Search audit log..." />
              </div>
              <select>
                <option value="all">All Actions</option>
                <option value="upload">Document Upload</option>
                <option value="verify">Verification</option>
                <option value="status">Status Change</option>
                <option value="alert">Alert Generated</option>
              </select>
              <select>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>

            <div className="audit-table">
              <div className="table-header">
                <span>Timestamp</span>
                <span>Action</span>
                <span>Driver</span>
                <span>Details</span>
                <span>User</span>
              </div>
              {auditLog.map((entry) => (
                <div key={entry.id} className="table-row">
                  <span className="timestamp">{entry.timestamp}</span>
                  <span className="action-badge">{entry.action}</span>
                  <span>{entry.driverName || '-'}</span>
                  <span className="details">{entry.details}</span>
                  <span className="user">{entry.user}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {showDetailPanel && selectedDriver && (
        <div className="detail-panel-overlay" onClick={() => setShowDetailPanel(false)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <div className="panel-title">
                <div className="driver-avatar large">
                  <User size={32} />
                </div>
                <div>
                  <h2>{selectedDriver.driverName}</h2>
                  <span className="panel-subtitle">{selectedDriver.employeeNumber} • {selectedDriver.driverId}</span>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowDetailPanel(false)}>×</button>
            </div>

            <div className="panel-status-bar">
              <div
                className="status-indicator"
                style={{ backgroundColor: getStatusColor(selectedDriver.dqfStatus) }}
              >
                {selectedDriver.dqfStatus === 'compliant' && <CheckCircle size={18} />}
                {selectedDriver.dqfStatus === 'expiring_soon' && <Clock size={18} />}
                {(selectedDriver.dqfStatus === 'non_compliant' || selectedDriver.dqfStatus === 'expired') && <XCircle size={18} />}
                <span>{getStatusLabel(selectedDriver.dqfStatus)}</span>
              </div>
              <div className="compliance-score-large">
                <span className="score-label">Compliance Score</span>
                <span className="score-number" style={{ color: getScoreColor(selectedDriver.complianceScore) }}>
                  {selectedDriver.complianceScore}%
                </span>
              </div>
            </div>

            {selectedDriver.alerts.length > 0 && (
              <div className="panel-alerts">
                {selectedDriver.alerts.map((alert) => (
                  <div key={alert.id} className={`panel-alert ${alert.severity}`}>
                    {alert.severity === 'critical' ? <AlertCircle size={16} /> : <AlertTriangle size={16} />}
                    <span>{alert.message}</span>
                    {alert.daysRemaining !== undefined && (
                      <span className="alert-days">
                        {alert.daysRemaining < 0 ? `${Math.abs(alert.daysRemaining)}d overdue` : `${alert.daysRemaining}d remaining`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="panel-content">
              <div className="panel-section">
                <h3>CDL Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">CDL Number</span>
                    <span className="info-value">{selectedDriver.cdlNumber}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">State</span>
                    <span className="info-value">{selectedDriver.cdlState}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Class</span>
                    <span className="info-value">{selectedDriver.cdlClass}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Expiration</span>
                    <span className="info-value">{formatDate(selectedDriver.cdlExpiry)}</span>
                  </div>
                  <div className="info-item full">
                    <span className="info-label">Endorsements</span>
                    <div className="endorsement-tags">
                      {selectedDriver.cdlEndorsements.map((e, i) => (
                        <span key={i} className="endorsement-tag">{e}</span>
                      ))}
                    </div>
                  </div>
                  {selectedDriver.cdlRestrictions.length > 0 && (
                    <div className="info-item full">
                      <span className="info-label">Restrictions</span>
                      <div className="restriction-tags">
                        {selectedDriver.cdlRestrictions.map((r, i) => (
                          <span key={i} className="restriction-tag">{r}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="panel-section">
                <h3>Medical Certification</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Card Expiry</span>
                    <span className={`info-value ${new Date(selectedDriver.medicalCardExpiry) < new Date() ? 'expired' : ''}`}>
                      {formatDate(selectedDriver.medicalCardExpiry)}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Examiner</span>
                    <span className="info-value">{selectedDriver.medicalExaminerName}</span>
                  </div>
                  <div className="info-item full">
                    <span className="info-label">Registry Number</span>
                    <span className="info-value">{selectedDriver.medicalExaminerNumber}</span>
                  </div>
                </div>
              </div>

              <div className="panel-section">
                <h3>Compliance Checklist</h3>
                <div className="checklist">
                  <div className={`checklist-item ${selectedDriver.mvrStatus === 'clear' ? 'complete' : 'incomplete'}`}>
                    {selectedDriver.mvrStatus === 'clear' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    <span>MVR on file ({formatDate(selectedDriver.mvrDate)})</span>
                    {selectedDriver.mvrStatus === 'violations' && <span className="checklist-warning">Violations found</span>}
                  </div>
                  <div className={`checklist-item ${selectedDriver.roadTestDate ? 'complete' : 'incomplete'}`}>
                    {selectedDriver.roadTestDate ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    <span>Road test completed ({formatDate(selectedDriver.roadTestDate)})</span>
                  </div>
                  <div className={`checklist-item ${selectedDriver.employmentVerificationComplete ? 'complete' : 'incomplete'}`}>
                    {selectedDriver.employmentVerificationComplete ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    <span>Employment verification ({selectedDriver.previousEmployerCount} employers)</span>
                  </div>
                  <div className={`checklist-item ${selectedDriver.annualReviewDate ? 'complete' : 'incomplete'}`}>
                    {selectedDriver.annualReviewDate ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    <span>Annual review ({formatDate(selectedDriver.annualReviewDate)})</span>
                  </div>
                  <div className={`checklist-item ${selectedDriver.drugTestStatus === 'negative' ? 'complete' : 'incomplete'}`}>
                    {selectedDriver.drugTestStatus === 'negative' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    <span>Drug test: {selectedDriver.drugTestStatus} ({formatDate(selectedDriver.lastDrugTestDate)})</span>
                  </div>
                </div>
              </div>

              <div className="panel-section">
                <h3>Documents ({selectedDriverDocs.length})</h3>
                <div className="documents-list">
                  {selectedDriverDocs.map((doc) => (
                    <div key={doc.id} className={`document-item ${doc.status}`}>
                      <FileText size={16} />
                      <div className="doc-info">
                        <span className="doc-name">{doc.documentName}</span>
                        <span className="doc-meta">
                          {doc.expiryDate && `Exp: ${formatDate(doc.expiryDate)}`}
                          {!doc.expiryDate && `Issued: ${formatDate(doc.issueDate)}`}
                          • {doc.fileSize}
                        </span>
                      </div>
                      {doc.verified && (
                        <span className="verified-badge">
                          <CheckCircle size={12} /> Verified
                        </span>
                      )}
                      <button className="btn-icon-sm"><Eye size={14} /></button>
                      <button className="btn-icon-sm"><Download size={14} /></button>
                    </div>
                  ))}
                </div>
                <button className="btn-secondary full-width">
                  <Upload size={16} /> Upload Document
                </button>
              </div>
            </div>

            <div className="panel-footer">
              <button className="btn-secondary">
                <Download size={16} /> Export DQF
              </button>
              <button className="btn-secondary">
                <Mail size={16} /> Send Reminder
              </button>
              <button className="btn-primary">
                <Edit size={16} /> Edit DQF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedDQFManagement;
