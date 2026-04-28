import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/layouts/AppLayout";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Profile from "./pages/Profile.tsx";
import Colleagues from "./pages/Colleagues.tsx";
import Ensembles from "./pages/Ensembles.tsx";
import EnsembleDetail from "./pages/EnsembleDetail.tsx";
import InviteAccept from "./pages/InviteAccept.tsx";
import Library from "./pages/Library.tsx";
import Discover from "./pages/Discover.tsx";
import Spaces from "./pages/Spaces.tsx";
import Inbox from "./pages/Inbox.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return <main className="min-h-screen" />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/invites/:token" element={<Protected><InviteAccept /></Protected>} />

            {/* App shell with sidebar */}
            <Route element={<Protected><AppLayout /></Protected>}>
              <Route path="/" element={<Navigate to="/practise" replace />} />
              <Route path="/practise" element={<Index />} />
              <Route path="/ensembles" element={<Ensembles />} />
              <Route path="/ensembles/:id" element={<EnsembleDetail />} />
              <Route path="/library" element={<Library />} />
              <Route path="/spaces" element={<Spaces />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/colleagues" element={<Colleagues />} />
              <Route path="/collegues" element={<Navigate to="/colleagues" replace />} />
              <Route path="/discover" element={<Discover />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
