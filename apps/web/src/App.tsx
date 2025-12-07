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

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
