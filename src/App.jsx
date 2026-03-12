import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { AchievementProvider } from "./context/AchievementContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import AuthCallback from "./pages/AuthCallback";
import DnDOnboarding from "./DnDOnboarding";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import CampaignBrowser from "./pages/CampaignBrowser";
import PartyFinder from "./pages/PartyFinder";
import ChatWidget from "./components/ChatWidget";
import DiceRoller from "./components/DiceRoller";
import LandingPage from "./pages/LandingPage";
import SchedulerPage from "./pages/SchedulerPage";
import JournalPage from "./pages/JournalPage";
import JournalsListPage from "./pages/JournalsListPage";
import HomebrewPage from "./pages/HomebrewPage";
import FriendsPage from "./pages/FriendsPage";
import CharacterSheetPage from "./pages/CharacterSheetPage";
import CharacterSheetsListPage from "./pages/CharacterSheetsListPage";
import MapsListPage from "./pages/MapsListPage";
import MapBuilderPage from "./pages/MapBuilderPage";
import CalendarPage from "./pages/CalendarPage";
import CampaignDashboardPage from "./pages/CampaignDashboardPage";
import SessionPlayPage from "./pages/SessionPlayPage";
import AdminPage from "./pages/AdminPage";
import RulesPage from "./pages/RulesPage";
import NPCLibraryPage from "./pages/NPCLibraryPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";


function RootRedirect() {
  const { user, loading } = useAuth();
  const [profileChecked, setProfileChecked] = useState(false);
  const [destination, setDestination] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setDestination("landing");
      setProfileChecked(true);
      return;
    }
    const checkProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", user.id)
        .maybeSingle();
      if (!data || !data.onboarding_complete) {
        setDestination("onboarding");
      } else {
        setDestination("home");
      }
      setProfileChecked(true);
    };
    checkProfile();
  }, [user, loading]);

  if (!profileChecked) return null;
  if (destination === "landing") return <LandingPage />;
  if (destination === "onboarding") return <Navigate to="/onboarding" replace />;
  return <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <AchievementProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/onboarding" element={
              <ProtectedRoute><DnDOnboarding /></ProtectedRoute>
            } />
            <Route path="/home" element={
              <ProtectedRoute><HomePage /></ProtectedRoute>
            } />
            <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/profile/:id" element={
              <ProtectedRoute><ProfilePage /></ProtectedRoute>
            } />
            <Route path="/campaigns" element={
              <ProtectedRoute><CampaignBrowser /></ProtectedRoute>
            } />
            <Route path="/party" element={
              <ProtectedRoute><PartyFinder /></ProtectedRoute>
            } />
            <Route path="/characters" element={<ProtectedRoute><CharacterSheetsListPage /></ProtectedRoute>} />
            <Route path="/character/:id" element={<ProtectedRoute><CharacterSheetPage /></ProtectedRoute>} />
            <Route path="/scheduler" element={
            <ProtectedRoute><SchedulerPage /></ProtectedRoute>
            } />
            <Route path="/maps" element={<ProtectedRoute><MapsListPage /></ProtectedRoute>} />
            <Route path="/map/:id" element={<ProtectedRoute><MapBuilderPage /></ProtectedRoute>} />
            <Route path="/journals" element={<ProtectedRoute><JournalsListPage /></ProtectedRoute>} />
            <Route path="/journal/:journalId" element={<ProtectedRoute><JournalPage /></ProtectedRoute>} />
            <Route path="/homebrew" element={<ProtectedRoute><HomebrewPage /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="/rules" element={<ProtectedRoute><RulesPage /></ProtectedRoute>} />
            <Route path="/npcs" element={<ProtectedRoute><NPCLibraryPage /></ProtectedRoute>} />
            <Route path="/campaign/:id/dashboard" element={<ProtectedRoute><CampaignDashboardPage /></ProtectedRoute>} />
            <Route path="/campaign/:id/session/:sessionId/play" element={<ProtectedRoute><SessionPlayPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ChatWidget />
          <DiceRoller />
          </AchievementProvider>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}