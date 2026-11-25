import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { OverviewPage } from './pages/OverviewPage';
import { CheckInPage } from './pages/CheckInPage';
import { CheckInResultPage } from './pages/CheckInResultPage';
import { InsightsPage } from './pages/InsightsPage';
import { PlannerPage } from './pages/PlannerPage';
import { SupportNetworkPage } from './pages/SupportNetworkPage';
import { SettingsPage } from './pages/SettingsPage';
import { PrivacyModalProvider } from './context/PrivacyModalContext';
import { ThemeProvider } from './context/ThemeContext';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <PrivacyModalProvider>
          <Routes>
            {/* Landing Page at root */}
            <Route path="/" element={<LandingPage />} />

            {/* Core Student Application Routes */}
            <Route element={<AppLayout />}>
              <Route path="/app" element={<OverviewPage />} />
              <Route path="/overview" element={<Navigate to="/app" replace />} />
              <Route path="/checkin" element={<CheckInPage />} />
              <Route path="/checkin/result" element={<CheckInResultPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/planner" element={<PlannerPage />} />
              <Route path="/support" element={<SupportNetworkPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PrivacyModalProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
