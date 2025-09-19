import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AgentActivityDashboard } from "@/components/AgentActivityDashboard";
import { AgentReportsAndLogs } from "@/components/AgentReportsAndLogs";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CallResultUpdate from "./pages/CallResultUpdate";
import CallResultJourney from "./pages/CallResultJourney";
import NewCallback from "./pages/NewCallback";
import DailyDealFlowPage from "./pages/DailyDealFlow/DailyDealFlowPage";
import TransferPortalPage from "./pages/TransferPortalPage";
import SubmissionPortalPage from "./pages/SubmissionPortalPage";
import BulkLookupPage from "./pages/BulkLookupPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/call-result-update" 
              element={
                <ProtectedRoute>
                  <CallResultUpdate />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/new-callback" 
              element={
                <ProtectedRoute>
                  <NewCallback />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/call-result-journey" 
              element={
                <ProtectedRoute>
                  <CallResultJourney />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute>
                  <AgentActivityDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/daily-deal-flow" 
              element={
                <ProtectedRoute>
                  <DailyDealFlowPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/transfer-portal" 
              element={
                <ProtectedRoute>
                  <TransferPortalPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/submission-portal" 
              element={
                <ProtectedRoute>
                  <SubmissionPortalPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/reports" 
              element={
                <ProtectedRoute>
                  <AgentReportsAndLogs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/bulk-lookup" 
              element={
                <ProtectedRoute>
                  <BulkLookupPage />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
