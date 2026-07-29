import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { VideoProvider } from './contexts/VideoContext.jsx';
import LandingPage from './pages/LandingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EditorPage from './pages/EditorPage.jsx';

export default function App() {
  return (
    <VideoProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/editor/:id" element={<EditorPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </VideoProvider>
  );
}
