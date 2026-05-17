import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import API from "../api/axios";
import { Pencil, Trash2, Plus, Bell } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import AlertModal from "../components/AlertModal";
import useDebounce from "../hooks/useDebounce";
import useAdminLocationStore from "../stores/useAdminLocationStore";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import TableSkeleton from "../components/admin/TableSkeleton";
import Pagination from "../components/admin/Pagination";

const ALERT_TYPES = ["flood", "earthquake", "fire", "landslide", "storm", "other"];
const PAGE_SIZE = 10;

export default function ManageAlerts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  const { adminLocation } = useAdminLocationStore();
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => { if (adminLocation && !locationFilter) setLocationFilter(adminLocation); }, [adminLocation]);

  const { data: alerts = [], isLoading: loading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => API.get("/alerts").then((res) => res.data),
  });

  const filtered = useMemo(() => {
    let data = [...alerts];
    if (debouncedSearch) { const q = debouncedSearch.toLowerCase(); data = data.filter((a) => a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q)); }
    if (typeFilter) data = data.filter((a) => a.type === typeFilter);
    if (locationFilter) data = data.filter((a) => a.location?.toLowerCase().includes(locationFilter.toLowerCase()));
    return data;
  }, [alerts, debouncedSearch, typeFilter, locationFilter]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, typeFilter, locationFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleDelete = async (id) => {
    if (!confirm("Delete this alert?")) return;
    try { 
      await API.delete(`/alerts/${id}`); 
      toast.success("Alert deleted"); 
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    }
    catch { toast.error("Failed to delete alert"); }
  };

  const handleModalSubmit = async (data) => {
    try {
      if (selectedAlert) { 
        await API.put(`/alerts/${selectedAlert._id}`, data); 
        toast.success("Alert updated"); 
      }
      else { 
        await API.post("/alerts", data); 
        toast.success("Alert created"); 
      }
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    } catch { toast.error("Operation failed"); }
    finally { setSelectedAlert(null); setShowModal(false); }
  };

  const clearAll = () => { setSearch(""); setTypeFilter(""); setLocationFilter(""); };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3 hover:text-indigo-600 transition-colors cursor-pointer">
          <Bell className="text-indigo-500" size={32} /> Manage Alerts
        </h1>
        <button onClick={() => { setSelectedAlert(null); setShowModal(true); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow text-sm font-medium transition">
          <Plus size={16} /> Create Alert
        </button>
      </div>

      <AdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search by title or description..." locationFilter={locationFilter} onLocationChange={setLocationFilter}
        filters={[{ label: "Type", value: typeFilter, onChange: setTypeFilter, options: ALERT_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) })) }]}
        onClearAll={clearAll}
      />

      <div className="overflow-x-auto bg-white rounded-2xl shadow-lg ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr>{["Title", "Type", "Location", "Time", "Actions"].map((h) => (<th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>))}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <TableSkeleton rows={PAGE_SIZE} cols={5} /> : paginated.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-12 text-gray-400">No alerts found.</td></tr>
            ) : paginated.map((alert, i) => (
              <motion.tr key={alert._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-indigo-50/30 transition">
                <td className="px-6 py-4 text-sm text-gray-800 font-medium">{alert.title}</td>
                <td className="px-6 py-4 text-sm"><span className="bg-gray-100 px-2.5 py-1 rounded-full text-xs font-semibold capitalize">{alert.type}</span></td>
                <td className="px-6 py-4 text-sm text-gray-600">{alert.location}</td>
                <td className="px-6 py-4 text-sm text-gray-500 tabular-nums">{new Date(alert.timestamp).toLocaleString()}</td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => { setSelectedAlert(alert); setShowModal(true); }} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"><Pencil size={13} /> Edit</button>
                  <button onClick={() => handleDelete(alert._id)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition"><Trash2 size={13} /> Delete</button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>

      <AlertModal open={showModal} onClose={() => { setSelectedAlert(null); setShowModal(false); }} onSubmit={handleModalSubmit} initialData={selectedAlert} />
    </>
  );
}
