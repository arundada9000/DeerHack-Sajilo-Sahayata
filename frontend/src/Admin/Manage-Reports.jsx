import React, { useEffect, useState, useMemo } from "react";
import API from "../api/axios";
import Modal from "../components/ReportEditModal";
import { motion, AnimatePresence } from "framer-motion";
import { ListChecks, Clock, ShieldCheck, Hammer, CheckCircle } from "lucide-react";
import useDebounce from "../hooks/useDebounce";
import useAdminLocationStore from "../stores/useAdminLocationStore";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import TableSkeleton from "../components/admin/TableSkeleton";
import Pagination from "../components/admin/Pagination";

const REPORT_TYPES = ["fire", "police", "flood", "accident", "landslide", "other"];
const STATUS_TYPES = ["pending", "verified", "solved", "working"];
const PAGE_SIZE = 10;

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const { adminLocation } = useAdminLocationStore();
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (adminLocation && !locationFilter) setLocationFilter(adminLocation);
  }, [adminLocation]);

  useEffect(() => {
    API.get("/reports")
      .then((res) => setReports(res.data))
      .catch((err) => console.error("Error loading reports", err))
      .finally(() => setLoading(false));
  }, []);

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
  const handleUpdate = (updated) => {
    if (updated.deleted) setReports((p) => p.filter((r) => r._id !== updated._id));
    else setReports((p) => p.map((r) => (r._id === updated._id ? updated : r)));
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
      <div className="flex items-center gap-3 mb-6">
        <img src="/assets/logo.png" alt="Logo" className="w-10 h-10" />
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Manage Reports</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {cards.map(({ label, color, count, icon }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`rounded-xl p-4 shadow-sm text-center ${color} flex flex-col items-center`}>
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
                <td className="px-6 py-4"><button onClick={() => handleEdit(r)} className="px-4 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Edit</button></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>

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
