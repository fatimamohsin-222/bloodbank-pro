import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './features/auth/LoginPage';
import UserProfilePage from './features/auth/UserProfilePage';
import UserManagementPage from './features/admin/UserManagementPage';
import DonorListPage from './features/donors/DonorListPage';
import DonorRegisterForm from './features/donors/DonorRegisterForm';
import DonorProfilePage from './features/donors/DonorProfilePage';
import RecallCampaignPage from './features/donors/RecallCampaignPage';
import DonationSessionsPage from './features/testing/DonationSessionsPage';
import TestingDashboardPage from './features/testing/TestingDashboardPage';
import InventoryPage from './features/inventory/InventoryPage';
import TransferOrdersPage from './features/inventory/TransferOrdersPage';
import BloodRequestsPage from './features/requests/BloodRequestsPage';
import TransfusionsPage from './features/requests/TransfusionsPage';
import DashboardConsolePage from './features/dashboard/DashboardConsolePage';
import LandingPage from './features/public/LandingPage';
import RegisterPage from './features/public/RegisterPage';
import DonorDashboard from './features/public/DonorDashboard';
import RecipientDashboard from './features/public/RecipientDashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Anonymous Public Access */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Self-Service Portals (Role Protected) */}
        <Route element={<ProtectedRoute allowedRoles={['Donor']} />}>
          <Route path="/donor-dashboard" element={<DonorDashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['Recipient']} />}>
          <Route path="/recipient-dashboard" element={<RecipientDashboard />} />
        </Route>

        {/* Clinical Portal & Management Shell */}
        <Route element={<ProtectedRoute allowedRoles={['SuperAdmin', 'FacilityAdmin', 'SystemAdmin', 'LabTech', 'Physician', 'Auditor']} />}>
          <Route element={<DashboardLayout />}>
            <Route path="/portal" element={<DashboardConsolePage />} />
            <Route path="/profile" element={<UserProfilePage />} />
            
            {/* Protected User Management */}
            <Route element={<ProtectedRoute allowedRoles={['SuperAdmin', 'FacilityAdmin', 'SystemAdmin']} />}>
              <Route path="/users" element={<UserManagementPage />} />
            </Route>

            {/* Scaffolding routes for clinical modules */}
            <Route path="/donors" element={<DonorListPage />} />
            <Route path="/donors/register" element={<DonorRegisterForm />} />
            <Route path="/donors/:id" element={<DonorProfilePage />} />
            <Route path="/donors/recall" element={<RecallCampaignPage />} />
            <Route path="/testing" element={<DonationSessionsPage />} />
            <Route path="/testing/lab" element={<TestingDashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/transfers" element={<TransferOrdersPage />} />
            <Route path="/requests" element={<BloodRequestsPage />} />
            <Route path="/transfusions" element={<TransfusionsPage />} />
          </Route>
        </Route>

        {/* Catch All Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
