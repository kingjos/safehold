import { useEffect, useState } from "react";
import { format, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { 
  Plus, 
  Search, 
  FileText, 
  Loader2,
  Filter,
  Calendar,
  CalendarIcon,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<'transactions'>;

const ITEMS_PER_PAGE = 10;

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "pending_funding", label: "Pending Funding" },
  { value: "funded", label: "Funded" },
  { value: "in_progress", label: "In Progress" },
  { value: "pending_release", label: "Pending Release" },
  { value: "completed", label: "Completed" },
  { value: "disputed", label: "Disputed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    pending_funding: "status-pending",
    funded: "status-active",
    in_progress: "status-active",
    pending_release: "status-active",
    completed: "status-completed",
    disputed: "status-disputed",
    cancelled: "status-pending",
    refunded: "status-pending"
  };
  const labels: Record<string, string> = {
    pending_funding: "Pending Funding",
    funded: "Funded",
    in_progress: "In Progress",
    pending_release: "Pending Release",
    completed: "Completed",
    disputed: "Disputed",
    cancelled: "Cancelled",
    refunded: "Refunded"
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || "status-pending"}`}>
      {labels[status] || status}
    </span>
  );
};

const ClientEscrows = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  useEffect(() => {
    filterTransactions();
    setCurrentPage(1); // Reset to first page when filters change
  }, [transactions, searchQuery, statusFilter, startDate, endDate]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => 
        tx.title.toLowerCase().includes(query) ||
        tx.description?.toLowerCase().includes(query) ||
        tx.vendor_email?.toLowerCase().includes(query) ||
        tx.id.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    // Date range filtering
    if (startDate) {
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.created_at);
        return isAfter(txDate, startOfDay(startDate)) || txDate.toDateString() === startDate.toDateString();
      });
    }

    if (endDate) {
      filtered = filtered.filter(tx => {
        const txDate = new Date(tx.created_at);
        return isBefore(txDate, endOfDay(endDate)) || txDate.toDateString() === endDate.toDateString();
      });
    }

    setFilteredTransactions(filtered);
  };

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <DashboardLayout userType="client">
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold">My Escrows</h1>
            <p className="text-muted-foreground">Manage all your escrow transactions</p>
          </div>
          <Link to="/dashboard/escrows/new">
            <Button variant="default" size="lg">
              <Plus className="w-5 h-5" />
              Create Escrow
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by title, vendor, or ID..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Range Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[180px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "From date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[180px] justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "To date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                <X className="w-4 h-4 mr-1" />
                Clear dates
              </Button>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground">Total Escrows</p>
            <p className="text-2xl font-display font-bold">{transactions.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-display font-bold text-primary">
              {transactions.filter(tx => ['funded', 'in_progress', 'pending_release'].includes(tx.status)).length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-display font-bold text-success">
              {transactions.filter(tx => tx.status === 'completed').length}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <p className="text-sm text-muted-foreground">Disputed</p>
            <p className="text-2xl font-display font-bold text-destructive">
              {transactions.filter(tx => tx.status === 'disputed').length}
            </p>
          </div>
        </div>

        {/* Transactions List */}
        <div className="rounded-2xl bg-card border border-border shadow-soft overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              {transactions.length === 0 ? (
                <>
                  <p className="text-lg font-medium mb-2">No escrows yet</p>
                  <p className="text-muted-foreground mb-4">Create your first escrow to get started</p>
                  <Link to="/dashboard/escrows/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Escrow
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">No results found</p>
                  <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {paginatedTransactions.map((tx) => (
                  <Link
                    key={tx.id}
                    to={`/dashboard/transactions/${tx.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 hover:bg-accent/50 transition-colors gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{tx.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {tx.vendor_email || 'No vendor assigned'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 sm:hidden">
                          <Calendar className="w-3 h-3" />
                          {formatDate(tx.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                      <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {formatDate(tx.created_at)}
                      </div>
                      <p className="font-semibold text-lg">₦{Number(tx.amount).toLocaleString()}</p>
                      {getStatusBadge(tx.status)}
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length}
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {getPageNumbers().map((page, i) => (
                          <PaginationItem key={i}>
                            {page === 'ellipsis' ? (
                              <PaginationEllipsis />
                            ) : (
                              <PaginationLink
                                onClick={() => setCurrentPage(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientEscrows;
