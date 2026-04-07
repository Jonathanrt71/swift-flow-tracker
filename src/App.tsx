import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleRoute from "@/components/RoleRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";
import Admin from "./pages/Admin.tsx";
import Profile from "./pages/Profile.tsx";
import Meetings from "./pages/Meetings.tsx";
import Events from "./pages/Events.tsx";
import CBME from "./pages/CBME.tsx";
import Feedback from "./pages/Feedback.tsx";
import Handbook from "./pages/Handbook.tsx";
import GMEHandbook from "./pages/GMEHandbook.tsx";
import Rotations from "./pages/Rotations.tsx";
import Operations from "./pages/Operations.tsx";
import Compliance from "./pages/Compliance.tsx";
import Topics from "./pages/Topics.tsx";
import Announcements from "./pages/Announcements.tsx";
import Evaluations from "./pages/Evaluations.tsx";
import BlockSchedule from "./pages/BlockSchedule.tsx";
import ProcedureLogs from "./pages/ProcedureLogs.tsx";
import ResidentSummary from "./pages/ResidentSummary.tsx";
import Home from "./pages/Home.tsx";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <div style={{ background: "#F5F3EE", minHeight: "100vh" }}>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/admin" element={<RoleRoute permissionKey="admin.all"><Admin /></RoleRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/meetings" element={<RoleRoute permissionKey="meetings.view"><Meetings /></RoleRoute>} />
              <Route path="/events" element={<RoleRoute permissionKey="events.view"><Events /></RoleRoute>} />
              <Route path="/feedback" element={<RoleRoute permissionKey="feedback.view"><Feedback /></RoleRoute>} />
              <Route path="/tasks" element={<RoleRoute permissionKey="tasks.view"><Index /></RoleRoute>} />
              <Route path="/cbme" element={<RoleRoute permissionKey="cbme.view"><CBME /></RoleRoute>} />
              <Route path="/handbook" element={<RoleRoute permissionKey="handbook.view"><Handbook /></RoleRoute>} />
              <Route path="/gme-handbook" element={<RoleRoute permissionKey="gme_handbook.view"><GMEHandbook /></RoleRoute>} />
              <Route path="/rotations" element={<ProtectedRoute><Rotations /></ProtectedRoute>} />
              <Route path="/operations" element={<RoleRoute permissionKey="operations.view"><Operations /></RoleRoute>} />
              <Route path="/compliance" element={<RoleRoute permissionKey="compliance.view"><Compliance /></RoleRoute>} />
              <Route path="/topics" element={<RoleRoute permissionKey="topics.view"><Topics /></RoleRoute>} />
              <Route path="/announcements" element={<RoleRoute permissionKey="announcements.view"><Announcements /></RoleRoute>} />
              <Route path="/evaluations" element={<RoleRoute permissionKey="evaluations.view"><Evaluations /></RoleRoute>} />
              <Route path="/schedule" element={<RoleRoute permissionKey="schedule.view"><BlockSchedule /></RoleRoute>} />
              <Route path="/procedure-logs" element={<RoleRoute permissionKey="procedures.view"><ProcedureLogs /></RoleRoute>} />
              <Route path="/resident-summary" element={<RoleRoute permissionKey="resident_summary.view"><ResidentSummary /></RoleRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
