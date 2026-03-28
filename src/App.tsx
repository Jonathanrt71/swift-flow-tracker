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
import Rotations from "./pages/Rotations.tsx";
import UpdatePrompt from "./components/UpdatePrompt";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <UpdatePrompt />
      <BrowserRouter>
        <AuthProvider>
          <div className="mx-auto w-full max-w-[1200px] min-h-screen relative shadow-lg">
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={<RoleRoute allowed={["admin", "faculty"]}><Feedback /></RoleRoute>} />
              <Route path="/admin" element={<RoleRoute allowed={["admin"]}><Admin /></RoleRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/meetings" element={<RoleRoute allowed={["admin"]}><Meetings /></RoleRoute>} />
              <Route path="/events" element={<RoleRoute allowed={["admin", "faculty", "resident"]}><Events /></RoleRoute>} />
              <Route path="/feedback" element={<RoleRoute allowed={["admin", "faculty"]}><Feedback /></RoleRoute>} />
              <Route path="/tasks" element={<RoleRoute allowed={["admin"]}><Index /></RoleRoute>} />
              <Route path="/cbme" element={<RoleRoute allowed={["admin"]}><CBME /></RoleRoute>} />
              <Route path="/handbook" element={<ProtectedRoute><Handbook /></ProtectedRoute>} />
              <Route path="/rotations" element={<ProtectedRoute><Rotations /></ProtectedRoute>} />
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
