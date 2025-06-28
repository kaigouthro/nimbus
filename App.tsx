import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import DashboardPanel from './components/sections/dashboard/DashboardPanel';
import InstanceManagerPanel from './components/sections/instances/InstanceManagerPanel';
import InstanceDetailPage from './components/sections/instances/InstanceDetailPage'; // New Import
import VolumeManagerPanel from './components/sections/volumes/VolumeManagerPanel';
import NetworkManagerPanel from './components/sections/networks/NetworkManagerPanel';
import ImageSelectorPanel from './components/sections/images/ImageSelectorPanel';
import SecurityGroupEditorPanel from './components/sections/securitygroups/SecurityGroupEditorPanel';
import AIChatPanel from './components/sections/ai/AIChatPanel';
import UsageQuotasPanel from './components/sections/quotas/UsageQuotasPanel';
import AuthForm from './components/auth/AuthForm';
import { useAuth } from './hooks/useAuth';
// ToastProvider removed, ToastContainer imported directly
import ToastContainer from './components/common/ToastContainer';

const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    // ToastProvider removed from here
    <HashRouter>
      <Routes>
        {/* Login route is always available */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthForm />
          } 
        />

        {/* Main application content.
            If not authenticated, redirect to /login.
            Otherwise, render MainLayout which contains the Outlet for protected routes.
        */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPanel />} />
          <Route path="instances" element={<InstanceManagerPanel />} />
          <Route path="instances/:instanceId" element={<InstanceDetailPage />} /> {/* New Route */}
          <Route path="volumes" element={<VolumeManagerPanel />} />
          <Route path="networks" element={<NetworkManagerPanel />} />
          <Route path="images" element={<ImageSelectorPanel />} />
          <Route path="security-groups" element={<SecurityGroupEditorPanel />} />
          <Route path="ai-assistant" element={<AIChatPanel />} />
          <Route path="quotas" element={<UsageQuotasPanel />} />
          {/* 
            A catch-all for any paths under "/" that aren't matched.
            If authenticated, it navigates to /dashboard.
            If not authenticated, the parent "/" route already redirected to /login.
          */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
      <ToastContainer /> {/* ToastContainer rendered once here */}
    </HashRouter>
    // ToastProvider removed from here
  );
};

export default App;