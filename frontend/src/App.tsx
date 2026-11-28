import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingState } from './components/ui/LoadingState';
import { PrivacyModalProvider } from './context/PrivacyModalContext';
import { RoamingPet } from './components/mascot/RoamingPet';

const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const OverviewPage = lazy(() =>
  import('./pages/OverviewPage').then((m) => ({ default: m.OverviewPage }))
);
const CompanionPage = lazy(() =>
  import('./pages/CompanionPage').then((m) => ({ default: m.CompanionPage }))
);
const CheckInPage = lazy(() =>
  import('./pages/CheckInPage').then((m) => ({ default: m.CheckInPage }))
);
const CheckInResultPage = lazy(() =>
  import('./pages/CheckInResultPage').then((m) => ({ default: m.CheckInResultPage }))
);
const InsightsPage = lazy(() =>
  import('./pages/InsightsPage').then((m) => ({ default: m.InsightsPage }))
);
const PlannerPage = lazy(() =>
  import('./pages/PlannerPage').then((m) => ({ default: m.PlannerPage }))
);
const SupportNetworkPage = lazy(() =>
  import('./pages/SupportNetworkPage').then((m) => ({ default: m.SupportNetworkPage }))
);
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const ExplorePage = lazy(() =>
  import('./pages/ExplorePage').then((m) => ({ default: m.ExplorePage }))
);

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <PrivacyModalProvider>
        <Suspense fallback={<LoadingState message="Loading Calmspace..." />}>
          <Routes>
            {/* Landing Page at root */}
            <Route path="/" element={<LandingPage />} />

            {/* Core Student Application Routes */}
            <Route element={<AppLayout />}>
              <Route path="/app" element={<OverviewPage />} />
              <Route path="/companion" element={<CompanionPage />} />
              <Route path="/overview" element={<Navigate to="/app" replace />} />
              <Route path="/checkin" element={<CheckInPage />} />
              <Route path="/checkin/result" element={<CheckInResultPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/planner" element={<PlannerPage />} />
              <Route path="/support" element={<SupportNetworkPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/explore" element={<ExplorePage />} />
            </Route>

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <RoamingPet />
      </PrivacyModalProvider>
    </BrowserRouter>
  );
};

export default App;
