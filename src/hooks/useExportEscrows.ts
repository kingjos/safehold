import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<'transactions'>;

const statusLabels: Record<string, string> = {
  pending_funding: "Pending Funding",
  funded: "Funded",
  in_progress: "In Progress",
  pending_release: "Pending Release",
  completed: "Completed",
  disputed: "Disputed",
  cancelled: "Cancelled",
  refunded: "Refunded"
};

export const useExportEscrows = () => {
  const exportToCSV = (transactions: Transaction[], filename: string = "escrows") => {
    if (transactions.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no escrows matching your current filters.",
        variant: "destructive"
      });
      return;
    }

    const headers = ["ID", "Title", "Description", "Amount (₦)", "Status", "Vendor Email", "Created Date", "Due Date"];
    
    const rows = transactions.map(tx => [
      tx.id,
      tx.title,
      tx.description || "",
      Number(tx.amount).toLocaleString(),
      statusLabels[tx.status] || tx.status,
      tx.vendor_email || "",
      format(new Date(tx.created_at), "yyyy-MM-dd"),
      tx.due_date ? format(new Date(tx.due_date), "yyyy-MM-dd") : ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `${transactions.length} escrow(s) exported to CSV.`
    });
  };

  const exportToPDF = (transactions: Transaction[], filename: string = "escrows", title: string = "Escrows Report") => {
    if (transactions.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no escrows matching your current filters.",
        variant: "destructive"
      });
      return;
    }

    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    // Add date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on ${format(new Date(), "PPP 'at' p")}`, 14, 30);
    
    // Add summary
    doc.setFontSize(11);
    doc.setTextColor(0);
    const totalAmount = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    doc.text(`Total Escrows: ${transactions.length} | Total Value: ₦${totalAmount.toLocaleString()}`, 14, 40);

    // Create table
    const tableData = transactions.map(tx => [
      tx.title.length > 25 ? tx.title.substring(0, 22) + "..." : tx.title,
      `₦${Number(tx.amount).toLocaleString()}`,
      statusLabels[tx.status] || tx.status,
      tx.vendor_email ? (tx.vendor_email.length > 20 ? tx.vendor_email.substring(0, 17) + "..." : tx.vendor_email) : "N/A",
      format(new Date(tx.created_at), "MMM d, yyyy")
    ]);

    autoTable(doc, {
      head: [["Title", "Amount", "Status", "Vendor", "Created"]],
      body: tableData,
      startY: 48,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 14, right: 14 }
    });

    doc.save(`${filename}_${format(new Date(), "yyyy-MM-dd")}.pdf`);

    toast({
      title: "Export successful",
      description: `${transactions.length} escrow(s) exported to PDF.`
    });
  };

  return { exportToCSV, exportToPDF };
};
