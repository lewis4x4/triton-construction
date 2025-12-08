import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { Dashboard } from './pages/Dashboard';
import { BidList } from './pages/bids/BidList';
import { CreateBid } from './pages/bids/CreateBid';
import { BidDetail } from './pages/bids/BidDetail';
import { BidCommandCenter } from './pages/bid-intelligence/BidCommandCenter';
import { SpecsPage } from './pages/specs/SpecsPage';
import { LocateTicketsPage } from './pages/locate-tickets/LocateTicketsPage';
import { TicketDetail } from './pages/locate-tickets/TicketDetail';
import { DigCheckPage } from './pages/locate-tickets/DigCheckPage';
import { DailyRadarPage } from './pages/locate-tickets/DailyRadarPage';
import { TicketMapPage } from './pages/locate-tickets/TicketMapPage';
import { AlertSettingsPage } from './pages/locate-tickets/AlertSettingsPage';
import { AnalyticsDashboard } from './pages/locate-tickets/AnalyticsDashboard';
import { OrganizationSettings } from './pages/settings/OrganizationSettings';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { RoleAccessControl } from './pages/admin/RoleAccessControl';
import { DocumentManagement } from './pages/admin/DocumentManagement';
// Workforce Compliance Module
import { WorkforceComplianceDashboard } from './pages/workforce-compliance/WorkforceComplianceDashboard';
import { CrewBuilder } from './components/workforce/CrewBuilder';
import { MaterialTicketCapture } from './components/workforce/MaterialTicketCapture';
import { IncidentReportForm } from './components/workforce/IncidentReportForm';
import { ToolboxTalkForm } from './components/workforce/ToolboxTalkForm';
import { FleetDashboard } from './components/workforce/FleetDashboard';
// Quality Control Module
import { QualityControlDashboard } from './pages/quality-control/QualityControlDashboard';
// Daily Reports
import { VoiceDailyReportPage } from './pages/daily-reports/VoiceDailyReportPage';
// Project Management
import { ProjectDashboard } from './pages/projects/ProjectDashboard';
// Subcontractor Management
import { SubcontractorDashboard } from './pages/subcontractors/SubcontractorDashboard';
// Document Management
import { DocumentDashboard } from './pages/documents/DocumentDashboard';
// Change Order Management
import { ChangeOrderDashboard } from './pages/change-orders/ChangeOrderDashboard';
// RFI Management
import { RFIDashboard } from './pages/rfis/RFIDashboard';
// AI Query
import { AIQueryPage } from './pages/ai/AIQueryPage';
// Predictive Analytics
import { PredictiveAnalyticsDashboard } from './pages/analytics/PredictiveAnalyticsDashboard';
// User Management
import { UserManagement } from './pages/admin/UserManagement';
// Assignment Validation Rules
import { AssignmentRulesAdmin } from './pages/admin/AssignmentRulesAdmin';
// Training Module
import { TrainingDashboard } from './pages/training/TrainingDashboard';
// Safety Module
import { DailySafetyBriefForm } from './components/safety/DailySafetyBriefForm';
import { StartMyDayScreen } from './components/safety/StartMyDayScreen';
// Self-Service Module
import { MyCertifications } from './pages/my/MyCertifications';
// Equipment & Crew Management Module
import {
  EquipmentFleetDashboard,
  CrewRoster,
  MaintenanceScheduling,
  OperatorQualifications,
  VehicleDetails,
  FuelManagement,
  VehicleInspections,
  DQFManagement,
  IFTAReporting
} from './pages/equipment';
// Pay Estimates Module
import { ValidationDashboard, PayEstimateUpload } from './pages/pay-estimates';
// Self-Perform Cost Tracking
import { SelfPerformDashboard } from './pages/self-perform';
// Platform Core - Alerts, Geofences, Executive Dashboard
import { PlatformAlertsDashboard } from './pages/alerts/PlatformAlertsDashboard';
import { GeofenceManagement } from './pages/geofences/GeofenceManagement';
import { ExecutiveDashboard } from './pages/executive/ExecutiveDashboard';
import './styles/index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes with Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Bid Package routes */}
          <Route
            path="/bids"
            element={
              <ProtectedRoute>
                <Layout>
                  <BidList />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateBid />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <BidDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/:id/command-center"
            element={
              <ProtectedRoute>
                <Layout>
                  <BidCommandCenter />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bid-command-center"
            element={
              <ProtectedRoute>
                <Layout>
                  <BidCommandCenter />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Specs routes */}
          <Route
            path="/specs"
            element={
              <ProtectedRoute>
                <Layout>
                  <SpecsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Locate Tickets routes */}
          <Route
            path="/locate-tickets"
            element={
              <ProtectedRoute>
                <Layout>
                  <LocateTicketsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/locate-tickets/dig-check"
            element={
              <ProtectedRoute>
                <Layout>
                  <DigCheckPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/locate-tickets/radar"
            element={
              <ProtectedRoute>
                <Layout>
                  <DailyRadarPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/locate-tickets/map"
            element={
              <ProtectedRoute>
                <Layout>
                  <TicketMapPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/locate-tickets/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <AlertSettingsPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/locate-tickets/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <TicketDetail />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/locate-tickets/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <AnalyticsDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Settings routes */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <OrganizationSettings />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Workforce Compliance routes */}
          <Route
            path="/workforce"
            element={
              <ProtectedRoute>
                <Layout>
                  <WorkforceComplianceDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workforce/crew-builder"
            element={
              <ProtectedRoute>
                <Layout>
                  <CrewBuilder projectId="" projectName="" onAssignmentCreated={() => {}} />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workforce/material-tickets"
            element={
              <ProtectedRoute>
                <Layout>
                  <MaterialTicketCapture projectId="" projectName="" />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workforce/incident-report"
            element={
              <ProtectedRoute>
                <Layout>
                  <IncidentReportForm projectId="" />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workforce/toolbox-talk"
            element={
              <ProtectedRoute>
                <Layout>
                  <ToolboxTalkForm projectId="" />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workforce/fleet"
            element={
              <ProtectedRoute>
                <Layout>
                  <FleetDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Training routes */}
          <Route
            path="/training"
            element={
              <ProtectedRoute>
                <Layout>
                  <TrainingDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Safety routes */}
          <Route
            path="/safety/start-my-day"
            element={
              <ProtectedRoute>
                <StartMyDayScreen projectId="" projectName="Select Project" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/safety/daily-brief"
            element={
              <ProtectedRoute>
                <DailySafetyBriefForm projectId="" />
              </ProtectedRoute>
            }
          />

          {/* Quality Control routes */}
          <Route
            path="/quality-control"
            element={
              <ProtectedRoute>
                <Layout>
                  <QualityControlDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Daily Reports routes */}
          <Route
            path="/daily-reports/voice"
            element={
              <ProtectedRoute>
                <Layout>
                  <VoiceDailyReportPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Project Management routes */}
          <Route
            path="/projects"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProjectDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Self-Perform Cost Tracking routes */}
          <Route
            path="/self-perform"
            element={
              <ProtectedRoute>
                <Layout>
                  <SelfPerformDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Pay Estimates routes */}
          <Route
            path="/pay-estimates"
            element={
              <ProtectedRoute>
                <Layout>
                  <ValidationDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pay-estimates/upload"
            element={
              <ProtectedRoute>
                <Layout>
                  <PayEstimateUpload />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pay-estimates/validation"
            element={
              <ProtectedRoute>
                <Layout>
                  <ValidationDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Subcontractor Management routes */}
          <Route
            path="/subcontractors"
            element={
              <ProtectedRoute>
                <Layout>
                  <SubcontractorDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Document Management routes */}
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <Layout>
                  <DocumentDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Change Order routes */}
          <Route
            path="/change-orders"
            element={
              <ProtectedRoute>
                <Layout>
                  <ChangeOrderDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* RFI routes */}
          <Route
            path="/rfis"
            element={
              <ProtectedRoute>
                <Layout>
                  <RFIDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* AI Query routes */}
          <Route
            path="/ai"
            element={
              <ProtectedRoute>
                <Layout>
                  <AIQueryPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Predictive Analytics routes */}
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Layout>
                  <PredictiveAnalyticsDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Self-Service routes */}
          <Route
            path="/my/certifications"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyCertifications />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Equipment & Crew Management routes */}
          <Route
            path="/equipment"
            element={
              <ProtectedRoute>
                <Layout>
                  <EquipmentFleetDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/crew"
            element={
              <ProtectedRoute>
                <Layout>
                  <CrewRoster />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/maintenance"
            element={
              <ProtectedRoute>
                <Layout>
                  <MaintenanceScheduling />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/qualifications"
            element={
              <ProtectedRoute>
                <Layout>
                  <OperatorQualifications />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/vehicles"
            element={
              <ProtectedRoute>
                <Layout>
                  <VehicleDetails />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/fuel"
            element={
              <ProtectedRoute>
                <Layout>
                  <FuelManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/inspections"
            element={
              <ProtectedRoute>
                <Layout>
                  <VehicleInspections />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/dqf"
            element={
              <ProtectedRoute>
                <Layout>
                  <DQFManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipment/ifta"
            element={
              <ProtectedRoute>
                <Layout>
                  <IFTAReporting />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Platform Core routes */}
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <Layout>
                  <PlatformAlertsDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/geofences"
            element={
              <ProtectedRoute>
                <Layout>
                  <GeofenceManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/executive"
            element={
              <ProtectedRoute>
                <Layout>
                  <ExecutiveDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/documents"
            element={
              <AdminRoute>
                <Layout>
                  <DocumentManagement />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/role-access"
            element={
              <AdminRoute>
                <Layout>
                  <RoleAccessControl />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <Layout>
                  <UserManagement />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/admin/validation-rules"
            element={
              <AdminRoute>
                <Layout>
                  <AssignmentRulesAdmin />
                </Layout>
              </AdminRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
