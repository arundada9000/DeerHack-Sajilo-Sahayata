import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import API from "../api/axios";
import { Plus, Trash2, Edit3, MapPin, Contact } from "lucide-react";
import toast from "react-hot-toast";
import useDebounce from "../hooks/useDebounce";
import useAdminLocationStore from "../stores/useAdminLocationStore";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import TableSkeleton from "../components/admin/TableSkeleton";
import Pagination from "../components/admin/Pagination";
import ContactEditModal from "../components/admin/ContactEditModal";

const departments = ["fire", "police", "flood", "accident", "landslide", "other"];
const PAGE_SIZE = 10;

export default function ManageContacts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const { adminLocation, availableLocations } = useAdminLocationStore();
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => { if (adminLocation && !locationFilter) setLocationFilter(adminLocation); }, [adminLocation]);

  const { data: records = [], isLoading: loading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => API.get("/contacts").then(res => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => API.delete(`/contacts/${id}`),
    onSuccess: () => {
      toast.success("Deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: () => toast.error("Failed to delete contact"),
  });

  const filtered = useMemo(() => {
    let data = [...records];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      data = data.filter((r) => r.localGovName.toLowerCase().includes(q) || r.department.toLowerCase().includes(q) || r.contacts.some((c) => c.name.toLowerCase().includes(q)));
    }
    if (deptFilter) data = data.filter((r) => r.department === deptFilter);
    if (locationFilter) data = data.filter((r) => r.localGovName.toLowerCase() === locationFilter.toLowerCase());
    return data;
  }, [records, debouncedSearch, deptFilter, locationFilter]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, deptFilter, locationFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const openCreateModal = () => {
    setEditingRecord(null);
    setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this contact record?")) return;
    deleteMutation.mutate(id);
  };

  const clearAll = () => { setSearch(""); setDeptFilter(""); setLocationFilter(""); };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3 hover:text-indigo-600 transition-colors cursor-pointer">
            <Contact className="text-indigo-500" size={32} /> Manage Contacts
          </h1>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow transition font-medium text-sm"><Plus size={16} /> Add New</button>
      </div>

      <AdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search by location, dept or name..." locationFilter={locationFilter} onLocationChange={setLocationFilter}
        filters={[{ label: "Department", value: deptFilter, onChange: setDeptFilter, options: departments.map((d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) })) }]}
        onClearAll={clearAll}
      />

      <div className="overflow-x-auto bg-white rounded-2xl shadow-lg ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr>{["Location", "Department", "Phone Numbers", "Actions"].map((h) => (<th key={h} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>))}</tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <TableSkeleton rows={PAGE_SIZE} cols={4} /> : paginated.length === 0 ? (
              <tr><td colSpan="4" className="text-center py-12 text-gray-400">No contact records found.</td></tr>
            ) : paginated.map((record, i) => (
              <motion.tr key={record._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.03 * i }} className="hover:bg-indigo-50/30 transition">
                <td className="px-6 py-4 text-sm font-medium text-gray-800"><div className="flex items-center gap-1.5"><MapPin size={16} className="text-gray-400" />{record.localGovName}</div></td>
                <td className="px-6 py-4 text-sm capitalize"><span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-semibold">{record.department}</span></td>
                <td className="px-6 py-4 text-sm text-gray-600"><div className="flex flex-col gap-1">{record.contacts.map((c, j) => (<div key={j}><span className="font-medium text-gray-800">{c.name}</span>: {c.phone}</div>))}</div></td>
                <td className="px-6 py-4 text-sm"><div className="flex gap-2">
                  <button onClick={() => openEditModal(record)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-xs font-medium"><Edit3 size={13} /> Edit</button>
                  <button onClick={() => handleDelete(record._id)} disabled={deleteMutation.isPending} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-xs font-medium disabled:opacity-50"><Trash2 size={13} /> Delete</button>
                </div></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} />
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ContactEditModal
            record={editingRecord}
            adminLocation={adminLocation}
            availableLocations={availableLocations}
            onClose={() => setModalOpen(false)}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["contacts"] })}
          />
        )}
      </AnimatePresence>
    </>
  );
}
