import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NotificationProvider } from "@/contexts/NotificationContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ClientDashboard from "./pages/dashboard/ClientDashboard";
import ClientWallet from "./pages/dashboard/ClientWallet";
import ClientSettings from "./pages/dashboard/ClientSettings";
import ClientNotifications from "./pages/dashboard/ClientNotifications";
import ClientDisputes from "./pages/dashboard/ClientDisputes";
import VendorDashboard from "./pages/dashboard/VendorDashboard";
import VendorWallet from "./pages/dashboard/VendorWallet";
import VendorSettings from "./pages/dashboard/VendorSettings";
import VendorNotifications from "./pages/dashboard/VendorNotifications";
import VendorDisputes from "./pages/dashboard/VendorDisputes";
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
    <NotificationProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ClientDashboard />} />
            <Route path="/dashboard/wallet" element={<ClientWallet />} />
            <Route path="/dashboard/settings" element={<ClientSettings />} />
            <Route path="/dashboard/notifications" element={<ClientNotifications />} />
            <Route path="/dashboard/disputes" element={<ClientDisputes />} />
            <Route path="/dashboard/disputes/:id" element={<DisputeDetail userType="client" />} />
            <Route path="/dashboard/escrows/new" element={<CreateEscrow />} />
            <Route path="/dashboard/transactions/:id" element={<TransactionDetail userType="client" />} />
            <Route path="/vendor" element={<VendorDashboard />} />
            <Route path="/vendor/transactions/:id" element={<TransactionDetail userType="vendor" />} />
            <Route path="/vendor/wallet" element={<VendorWallet />} />
            <Route path="/vendor/settings" element={<VendorSettings />} />
            <Route path="/vendor/notifications" element={<VendorNotifications />} />
            <Route path="/vendor/disputes" element={<VendorDisputes />} />
            <Route path="/vendor/disputes/:id" element={<DisputeDetail userType="vendor" />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/disputes" element={<AdminDisputes />} />
            <Route path="/admin/disputes/:id" element={<DisputeDetail userType="admin" />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </NotificationProvider>
  </QueryClientProvider>
);

export default App;
