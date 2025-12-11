import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ClientDashboard from "./pages/dashboard/ClientDashboard";
import ClientWallet from "./pages/dashboard/ClientWallet";
import ClientSettings from "./pages/dashboard/ClientSettings";
import ClientNotifications from "./pages/dashboard/ClientNotifications";
import ClientDisputes from "./pages/dashboard/ClientDisputes";
import ClientEscrows from "./pages/dashboard/ClientEscrows";
import VendorDashboard from "./pages/dashboard/VendorDashboard";
import VendorWallet from "./pages/dashboard/VendorWallet";
import VendorSettings from "./pages/dashboard/VendorSettings";
import VendorNotifications from "./pages/dashboard/VendorNotifications";
import VendorDisputes from "./pages/dashboard/VendorDisputes";
import VendorEscrows from "./pages/dashboard/VendorEscrows";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import AdminSettings from "./pages/dashboard/AdminSettings";
import AdminDisputes from "./pages/dashboard/AdminDisputes";
import CreateEscrow from "./pages/dashboard/CreateEscrow";
import TransactionDetail from "./pages/dashboard/TransactionDetail";
import DisputeDetail from "./pages/dashboard/DisputeDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <NotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <ClientDashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/wallet" element={
                <ProtectedRoute>
                  <ClientWallet />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/settings" element={
                <ProtectedRoute>
                  <ClientSettings />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/notifications" element={
                <ProtectedRoute>
                  <ClientNotifications />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/disputes" element={
                <ProtectedRoute>
                  <ClientDisputes />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/escrows" element={
                <ProtectedRoute>
                  <ClientEscrows />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/disputes/:id" element={
                <ProtectedRoute>
                  <DisputeDetail userType="client" />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/escrows/new" element={
                <ProtectedRoute>
                  <CreateEscrow />
                </ProtectedRoute>
              } />
              <Route path="/dashboard/transactions/:id" element={
                <ProtectedRoute>
                  <TransactionDetail userType="client" />
                </ProtectedRoute>
              } />
              <Route path="/vendor" element={
                <ProtectedRoute requiredRole="vendor">
                  <VendorDashboard />
                </ProtectedRoute>
              } />
              <Route path="/vendor/transactions/:id" element={
                <ProtectedRoute requiredRole="vendor">
                  <TransactionDetail userType="vendor" />
                </ProtectedRoute>
              } />
              <Route path="/vendor/wallet" element={
                <ProtectedRoute requiredRole="vendor">
                  <VendorWallet />
                </ProtectedRoute>
              } />
              <Route path="/vendor/settings" element={
                <ProtectedRoute requiredRole="vendor">
                  <VendorSettings />
                </ProtectedRoute>
              } />
              <Route path="/vendor/notifications" element={
                <ProtectedRoute requiredRole="vendor">
                  <VendorNotifications />
                </ProtectedRoute>
              } />
              <Route path="/vendor/disputes" element={
                <ProtectedRoute requiredRole="vendor">
                  <VendorDisputes />
                </ProtectedRoute>
              } />
              <Route path="/vendor/escrows" element={
                <ProtectedRoute requiredRole="vendor">
                  <VendorEscrows />
                </ProtectedRoute>
              } />
              <Route path="/vendor/disputes/:id" element={
                <ProtectedRoute requiredRole="vendor">
                  <DisputeDetail userType="vendor" />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminSettings />
                </ProtectedRoute>
              } />
              <Route path="/admin/disputes" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDisputes />
                </ProtectedRoute>
              } />
              <Route path="/admin/disputes/:id" element={
                <ProtectedRoute requiredRole="admin">
                  <DisputeDetail userType="admin" />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </NotificationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
