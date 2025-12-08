import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ClientDashboard from "./pages/dashboard/ClientDashboard";
import ClientWallet from "./pages/dashboard/ClientWallet";
import ClientSettings from "./pages/dashboard/ClientSettings";
import VendorDashboard from "./pages/dashboard/VendorDashboard";
import VendorWallet from "./pages/dashboard/VendorWallet";
import VendorSettings from "./pages/dashboard/VendorSettings";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import AdminSettings from "./pages/dashboard/AdminSettings";
import CreateEscrow from "./pages/dashboard/CreateEscrow";
import TransactionDetail from "./pages/dashboard/TransactionDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
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
          <Route path="/dashboard/escrows/new" element={<CreateEscrow />} />
          <Route path="/dashboard/transactions/:id" element={<TransactionDetail userType="client" />} />
          <Route path="/vendor" element={<VendorDashboard />} />
          <Route path="/vendor/transactions/:id" element={<TransactionDetail userType="vendor" />} />
          <Route path="/vendor/wallet" element={<VendorWallet />} />
          <Route path="/vendor/settings" element={<VendorSettings />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
