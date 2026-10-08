import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreateCirclePage } from './pages/CreateCirclePage';
import { CircleDetailsPage } from './pages/CircleDetailsPage';
import { CircleMembersPage } from './pages/CircleMembersPage';
import { CircleRoundPage } from './pages/CircleRoundPage';
import { CircleActivityPage } from './pages/CircleActivityPage';
import { CircleVotingPage } from './pages/CircleVotingPage';
import { FaucetPage } from './pages/FaucetPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-black">
        <Navbar />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/groups/create" element={<CreateCirclePage />} />
            <Route path="/groups/:groupId" element={<CircleDetailsPage />} />
            <Route path="/groups/:groupId/members" element={<CircleMembersPage />} />
            <Route path="/groups/:groupId/round" element={<CircleRoundPage />} />
            <Route path="/groups/:groupId/activity" element={<CircleActivityPage />} />
            <Route path="/groups/:groupId/voting" element={<CircleVotingPage />} />
            <Route path="/faucet" element={<FaucetPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;

