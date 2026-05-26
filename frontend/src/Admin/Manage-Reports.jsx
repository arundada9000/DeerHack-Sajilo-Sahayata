import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import API from "../api/axios";
import Modal from "../components/ReportEditModal";
import { motion, AnimatePresence } from "framer-motion";
import { ListChecks, Clock, ShieldCheck, Hammer, CheckCircle, FileText, Download, Eye } from "lucide-react";
import useDebounce from "../hooks/useDebounce";
import useAdminLocationStore from "../stores/useAdminLocationStore";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import TableSkeleton from "../components/admin/TableSkeleton";
import Pagination from "../components/admin/Pagination";
import { exportToCSV } from "../utils/exportCsv";
import DetailModal from "../components/DetailModal";

const REPORT_TYPES = ["fire", "police", "flood", "accident", "landslide", "other"];
const STATUS_TYPES = ["pending", "verified", "solved", "working"];
const PAGE_SIZE = 10;

export default function Reports() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);

  const { adminLocation } = useAdminLocationStore();
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (adminLocation && !locationFilter) setLocationFilter(adminLocation);
  }, [adminLocation]);

  const { data: reports = [], isLoading: loading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => API.get("/reports").then((res) => res.data),
  });

  const filtered = useMemo(() => {
    let data = [...reports];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      data = data.filter((r) => r.description?.toLowerCase().includes(q) || r._id?.toLowerCase().includes(q));
    }
    if (statusFilter) data = data.filter((r) => r.status === statusFilter);
    if (typeFilter) data = data.filter((r) => r.type === typeFilter);
    if (locationFilter) data = data.filter((r) => r.localGovName?.toLowerCase() === locationFilter.toLowerCase());
    return data;
  }, [reports, debouncedSearch, statusFilter, typeFilter, locationFilter]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, statusFilter, typeFilter, locationFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleEdit = (report) => { setSelectedReport(report); setShowModal(true); };
  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["reports"] });
    setShowModal(false);
  };
  const clearAll = () => { setSearch(""); setStatusFilter(""); setTypeFilter(""); setLocationFilter(""); };

  const counts = useMemo(() => {
    const c = { pending: 0, verified: 0, working: 0, solved: 0 };
    reports.forEach((r) => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [reports]);

  const cards = [
    { label: "Total", color: "bg-gray-100 text-gray-800", count: reports.length, icon: <ListChecks size={22} /> },
    { label: "Pending", color: "bg-yellow-100 text-yellow-800", count: counts.pending, icon: <Clock size={22} /> },
    { label: "Verified", color: "bg-blue-100 text-blue-800", count: counts.verified, icon: <ShieldCheck size={22} /> },
    { label: "Working", color: "bg-purple-100 text-purple-800", count: counts.working, icon: <Hammer size={22} /> },
    { label: "Solved", color: "bg-green-100 text-green-800", count: counts.solved, icon: <CheckCircle size={22} /> },
  ];

  const statusColor = (s) => s === "pending" ? "bg-yellow-100 text-yellow-700" : s === "verified" ? "bg-blue-100 text-blue-700" : s === "working" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700";

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3 hover:text-indigo-600 transition-colors cursor-pointer">
          <FileText className="text-indigo-500" size={32} />
          Manage Reports
        </h1>
        <button 
          onClick={() => exportToCSV(filtered, "reports")}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-md px-4 py-2 rounded-lg shadow-sm font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {cards.map(({ label, color, count, icon }, i) => (
          <motion.div 
            key={label} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.08 }} 
            onClick={() => setStatusFilter(label === "Total" ? "" : label.toLowerCase())}
            className={`rounded-xl p-4 shadow-sm text-center ${color} flex flex-col items-center cursor-pointer hover:shadow-md hover:-translate-y-1 active:scale-95 transition-all`}
          >
            <div className="mb-1.5">{icon}</div>
            <div className="text-xs font-semibold uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-bold mt-1">{loading ? "—" : count}</div>
          </motion.div>
        ))}
      </div>

      <AdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search by description or ID..." locationFilter={locationFilter} onLocationChange={setLocationFilter}
        filters={[
          { label: "Status", value: statusFilter, onChange: setStatusFilter, options: STATUS_TYPES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })) },
          { label: "Type", value: typeFilter, onChange: setTypeFilter, options: REPORT_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })) },
        ]}
        onClearAll={clearAll}
      />

      <div className="overflow-x-auto bg-white rounded-2xl shadow-lg ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>{["Type", "Status", "Description", "Location", "Actions"].map((h) => (<th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <TableSkeleton rows={PAGE_SIZE} cols={5} /> : paginated.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-12 text-gray-400">No reports found.</td></tr>
            ) : paginated.map((r, i) => (
              <motion.tr key={r._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-indigo-50/30 transition">
                <td className="px-6 py-4 text-sm font-medium text-gray-800 flex items-center gap-2">
                  <img src={`/icons/map-icons-red/${r.type}.svg`} alt={r.type} className="w-5 h-5" /><span className="capitalize">{r.type}</span>
                </td>
                <td className="px-6 py-4 text-sm"><span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(r.status)}`}>{r.status}</span></td>
                <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate">{r.description?.slice(0, 50)}{r.description?.length > 50 ? "…" : ""}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{r.localGovName || "—"}</td>
                <td className="px-6 py-4"><div className="flex gap-2">
                  <button onClick={() => { setViewItem(r); setViewOpen(true); }} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 hover:-translate-y-0.5 hover:shadow-sm transition-all font-medium active:scale-95"><Eye size={13} /> View</button>
                  <button onClick={() => handleEdit(r)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95">Edit</button>
                </div></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>

      <DetailModal
        open={viewOpen}
        onClose={() => { setViewOpen(false); setViewItem(null); }}
        title="Report Details"
        icon={<FileText size={20} />}
        imageUrl={viewItem?.imageUrl ? (viewItem.imageUrl.startsWith("http") ? viewItem.imageUrl : `${import.meta.env.VITE_API_URL.replace("/api", "")}${viewItem.imageUrl}`) : null}
        fields={[
          { label: "Type", value: viewItem?.type, render: (v) => <span className="capitalize">{v}</span> },
          { label: "Status", value: viewItem?.status, render: (v) => <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${v === "pending" ? "bg-yellow-100 text-yellow-700" : v === "verified" ? "bg-blue-100 text-blue-700" : v === "working" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>{v}</span> },
          { label: "Description", value: viewItem?.description },
          { label: "Location", value: viewItem?.localGovName || "—" },
          { label: "Coordinates", value: viewItem?.location?.coordinates ? `[${viewItem.location.coordinates[0]?.toFixed(5)}, ${viewItem.location.coordinates[1]?.toFixed(5)}]` : "—" },
          { label: "Reported At", value: viewItem?.createdAt ? new Date(viewItem.createdAt).toLocaleString() : "—" },
          { label: "Updated At", value: viewItem?.updatedAt ? new Date(viewItem.updatedAt).toLocaleString() : "—" },
        ]}
      />
      <AnimatePresence>
        {showModal && selectedReport && (
          <motion.div key="report-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <Modal report={selectedReport} onClose={() => setShowModal(false)} onUpdate={handleUpdate} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
