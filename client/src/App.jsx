import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import MuseumsPage from './pages/MuseumsPage';
import MuseumDetailPage from './pages/MuseumDetailPage';
import ArtifactDetailPage from './pages/ArtifactDetailPage';
import AnimalDetailPage from './pages/AnimalDetailPage';
import AdminPortalPage from './pages/AdminPortalPage';
import ChatPage from './pages/ChatPage';
import RecommendationsPage from './pages/RecommendationsPage';
import MyBookingsPage from './pages/MyBookingsPage';
import StaffScannerPage from './pages/StaffScannerPage';
import SubmitComplaintPage from './pages/SubmitComplaintPage';
import MyComplaintsPage from './pages/MyComplaintsPage';
import AdminComplaintsPage from './pages/AdminComplaintsPage';
import NotFoundPage from './pages/NotFoundPage';
import ChatbotWidget from './components/ChatbotWidget';

export default function App() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      <Header />
      <div style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/museums" element={<MuseumsPage />} />
          <Route path="/museums/:id" element={<MuseumDetailPage />} />
          <Route path="/artifacts/:id" element={<ArtifactDetailPage />} />
          <Route path="/animals/:id" element={<AnimalDetailPage />} />
          <Route path="/admin" element={<AdminPortalPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/my-bookings" element={<MyBookingsPage />} />
          <Route path="/staff/scanner" element={<StaffScannerPage />} />
          <Route path="/submit-complaint" element={<SubmitComplaintPage />} />
          <Route path="/my-complaints" element={<MyComplaintsPage />} />
          <Route path="/admin/complaints" element={<AdminComplaintsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      <Footer />

      {/* Global Floating AI Assistant Widget */}
      <ChatbotWidget />
    </div>
  );
}
