import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../api/axios";
import { Plus, Trash2, Edit3, Save, X, MapPin } from "lucide-react";
import toast from "react-hot-toast";
import useDebounce from "../hooks/useDebounce";
import useAdminLocationStore from "../stores/useAdminLocationStore";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import TableSkeleton from "../components/admin/TableSkeleton";
import Pagination from "../components/admin/Pagination";

const departments = ["fire", "police", "flood", "accident", "landslide", "other"];
const PAGE_SIZE = 10;

export default function ManageContacts() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form, setForm] = useState({ localGovName: "", department: "fire", contacts: [{ name: "", phone: "", description: "" }] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { adminLocation, availableLocations } = useAdminLocationStore();
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => { if (adminLocation && !locationFilter) setLocationFilter(adminLocation); }, [adminLocation]);
  useEffect(() => { fetchRecords(); }, []);

  const fetchRecords = async () => {
    try { setLoading(true); const res = await API.get("/contacts"); setRecords(res.data); }
    catch { toast.error("Failed to load contacts"); }
    finally { setLoading(false); }
  };

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
    setForm({ localGovName: adminLocation || (availableLocations.length > 0 ? availableLocations[0] : ""), department: "fire", contacts: [{ name: "", phone: "", description: "" }] });
    setError(""); setModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setForm({ localGovName: record.localGovName, department: record.department, contacts: record.contacts.map((c) => ({ name: c.name || "", phone: c.phone || "", description: c.description || "" })) });
    setError(""); setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.localGovName.trim() || !form.department) { setError("Location and department are required."); return; }
    const valid = form.contacts.filter((c) => c.name.trim() && c.phone.trim());
    if (valid.length === 0) { setError("At least one contact with name and phone is required."); return; }
    try {
      setSaving(true); setError("");
      const payload = { localGovName: form.localGovName.trim(), department: form.department, contacts: valid };
      if (editingRecord) { await API.put(`/contacts/${editingRecord._id}`, payload); toast.success("Contact updated"); }
      else { await API.post("/contacts", payload); toast.success("Contact created"); }
      setModalOpen(false); fetchRecords();
    } catch (err) { setError(err.response?.data?.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this contact record?")) return;
    try { await API.delete(`/contacts/${id}`); setRecords((p) => p.filter((r) => r._id !== id)); toast.success("Deleted"); }
    catch { toast.error("Failed to delete"); }
  };

  const addRow = () => setForm((p) => ({ ...p, contacts: [...p.contacts, { name: "", phone: "", description: "" }] }));
  const removeRow = (i) => setForm((p) => ({ ...p, contacts: p.contacts.filter((_, idx) => idx !== i) }));
  const updateRow = (i, field, value) => setForm((p) => ({ ...p, contacts: p.contacts.map((c, idx) => idx === i ? { ...c, [field]: value } : c) }));
  const clearAll = () => { setSearch(""); setDeptFilter(""); setLocationFilter(""); };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <img src="/assets/logo.png" alt="Logo" className="w-10 h-10" />
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Manage Contacts</h1>
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
                  <button onClick={() => handleDelete(record._id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition text-xs font-medium"><Trash2 size={13} /> Delete</button>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-800">{editingRecord ? "Edit Contact Record" : "New Contact Record"}</h2>
                <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition"><X size={20} /></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-5">
                {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location / Municipality</label>
                    <select value={form.localGovName} onChange={(e) => setForm((p) => ({ ...p, localGovName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="">-- Select --</option>
                      {availableLocations.map((loc) => (<option key={loc} value={loc}>{loc} {loc === adminLocation ? "(Your Location)" : ""}</option>))}
                    </select>
                    <div className="mt-2 flex items-center gap-2"><span className="text-xs text-gray-500">Not in list?</span>
                      <input type="text" placeholder="Type custom location" className="flex-1 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-indigo-500 outline-none" onChange={(e) => { if (e.target.value) setForm((p) => ({ ...p, localGovName: e.target.value })); }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Department</label>
                    <select value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none capitalize">
                      {departments.map((d) => (<option key={d} value={d}>{d}</option>))}
                    </select>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">Phone Numbers</label>
                    <button type="button" onClick={addRow} className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium bg-indigo-50 px-2 py-1 rounded"><Plus size={14} /> Add Row</button>
                  </div>
                  <div className="space-y-3">
                    {form.contacts.map((c, i) => (
                      <div key={i} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input type="text" placeholder="Name" value={c.name} onChange={(e) => updateRow(i, "name", e.target.value)} className="w-full px-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <input type="text" placeholder="Phone" value={c.phone} onChange={(e) => updateRow(i, "phone", e.target.value)} className="w-full px-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                          <input type="text" placeholder="Details (Optional)" value={c.description} onChange={(e) => updateRow(i, "description", e.target.value)} className="w-full px-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        {form.contacts.length > 1 && <button type="button" onClick={() => removeRow(i)} className="p-1.5 text-red-500 hover:bg-red-100 rounded transition"><Trash2 size={16} /></button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50">
                <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-700 bg-white border hover:bg-gray-50 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium"><Save size={16} />{saving ? "Saving..." : "Save"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
