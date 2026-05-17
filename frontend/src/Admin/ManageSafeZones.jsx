import { useEffect, useState, useMemo } from "react";
import API from "../api/axios";
import { Pencil, Trash2, Plus, Shield, MapPin, Download } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import useDebounce from "../hooks/useDebounce";
import AdminFilterBar from "../components/admin/AdminFilterBar";
import TableSkeleton from "../components/admin/TableSkeleton";
import Pagination from "../components/admin/Pagination";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { exportToCSV } from "../utils/exportCsv";

const ZONE_TYPES = ["hospital", "shelter", "police", "fire_station", "distribution"];
const PAGE_SIZE = 10;

const typeColors = {
  hospital: "bg-emerald-100 text-emerald-700",
  shelter: "bg-blue-100 text-blue-700",
  police: "bg-indigo-100 text-indigo-700",
  fire_station: "bg-red-100 text-red-700",
  distribution: "bg-amber-100 text-amber-700",
};

// ═══ Safe Zone Modal ═══
function SafeZoneModal({ open, onClose, onSubmit, initialData }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("hospital");
  const [lng, setLng] = useState("");
  const [lat, setLat] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setType(initialData.type || "hospital");
      const coords = initialData.location?.coordinates;
      if (coords) {
        // Display as [lng, lat] in fields
        setLng(String(coords[0] || ""));
        setLat(String(coords[1] || ""));
      }
      setAddress(initialData.address || "");
      setPhone(initialData.phone || "");
      setIsActive(initialData.isActive !== false);
    } else {
      setName("");
      setType("hospital");
      setLng("");
      setLat("");
      setAddress("");
      setPhone("");
      setIsActive(true);
    }
  }, [initialData, open]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLng(String(pos.coords.longitude));
        setLat(String(pos.coords.latitude));
        toast.success("Location captured!");
      },
      () => toast.error("Failed to get location")
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    if (!lng || !lat) return toast.error("Coordinates are required");

    const lngNum = parseFloat(lng);
    const latNum = parseFloat(lat);
    if (isNaN(lngNum) || isNaN(latNum)) return toast.error("Invalid coordinates");

    onSubmit({
      name: name.trim(),
      type,
      coordinates: [lngNum, latNum],
      address: address.trim(),
      phone: phone.trim(),
      isActive,
    });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Shield size={20} className="text-emerald-600" />
              {initialData ? "Edit Safe Zone" : "Add Safe Zone"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lumbini Provincial Hospital"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              >
                {ZONE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Longitude *</label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="83.4681"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Latitude *</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="27.7111"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleUseMyLocation}
              className="flex items-center gap-2 text-sm text-emerald-600 font-semibold hover:text-emerald-700 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded p-1"
            >
              <MapPin size={14} /> Use my current location
            </button>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Butwal-11, Rupandehi"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="071-XXXXXX"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
              />
            </div>

            {initialData && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Active</span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${isActive ? "bg-emerald-500" : "bg-gray-300"}`}
                  aria-label="Toggle active status"
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${isActive ? "left-[26px]" : "left-0.5"}`}
                  />
                </button>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-200 transition text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700 transition text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-95"
              >
                {initialData ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ═══ Main Admin Page ═══
export default function ManageSafeZones() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data: zones = [], isLoading: loading } = useQuery({
    queryKey: ["safe-zones"],
    queryFn: () => API.get("/safe-zones").then((res) => res.data),
  });

  const filtered = useMemo(() => {
    let data = [...zones];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      data = data.filter(
        (z) =>
          z.name?.toLowerCase().includes(q) ||
          z.address?.toLowerCase().includes(q)
      );
    }
    if (typeFilter) data = data.filter((z) => z.type === typeFilter);
    return data;
  }, [zones, debouncedSearch, typeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, typeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleDelete = async (id) => {
    if (!confirm("Delete this safe zone?")) return;
    try {
      await API.delete(`/safe-zones/${id}`);
      toast.success("Safe zone deleted");
      queryClient.invalidateQueries({ queryKey: ["safe-zones"] });
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleModalSubmit = async (data) => {
    try {
      if (selectedZone) {
        await API.put(`/safe-zones/${selectedZone._id}`, data);
        toast.success("Safe zone updated");
      } else {
        await API.post("/safe-zones", data);
        toast.success("Safe zone created");
      }
      queryClient.invalidateQueries({ queryKey: ["safe-zones"] });
    } catch {
      toast.error("Operation failed");
    } finally {
      setSelectedZone(null);
      setShowModal(false);
    }
  };

  const clearAll = () => {
    setSearch("");
    setTypeFilter("");
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3 hover:text-emerald-600 transition-colors cursor-pointer">
            <Shield className="text-emerald-600" size={28} />
            Safe Zones
          </h1>
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">{filtered.length} zone{filtered.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => exportToCSV(filtered, "safe-zones")}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-md px-4 py-2 rounded-lg shadow-sm font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => {
              setSelectedZone(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-md text-white px-4 py-2 rounded-lg shadow-sm text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 active:scale-95"
          >
            <Plus size={16} /> Add Zone
          </button>
        </div>
      </div>

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or address..."
        filters={[
          {
            label: "Type",
            value: typeFilter,
            onChange: setTypeFilter,
            options: ZONE_TYPES.map((t) => ({
              value: t,
              label: t.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
            })),
          },
        ]}
        onClearAll={clearAll}
      />

      <div className="overflow-x-auto bg-white rounded-2xl shadow-lg ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Name", "Type", "Address", "Phone", "Status", "Actions"].map((h) => (
                <th
                  key={h}
                  className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <TableSkeleton rows={PAGE_SIZE} cols={6} />
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-12 text-gray-400">
                  No safe zones found. Add your first one!
                </td>
              </tr>
            ) : (
              paginated.map((zone, i) => (
                <motion.tr
                  key={zone._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-emerald-50/30 transition"
                >
                  <td className="px-6 py-4 text-sm text-gray-800 font-medium">{zone.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${typeColors[zone.type] || "bg-gray-100 text-gray-700"}`}>
                      {zone.type?.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{zone.address || "—"}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 tabular-nums">{zone.phone || "—"}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${zone.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {zone.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedZone(zone);
                        setShowModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-sm text-white rounded-lg font-medium transition-all active:scale-95"
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(zone._id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 hover:-translate-y-0.5 hover:shadow-sm font-medium transition-all active:scale-95"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
        />
      </div>

      <SafeZoneModal
        open={showModal}
        onClose={() => {
          setSelectedZone(null);
          setShowModal(false);
        }}
        onSubmit={handleModalSubmit}
        initialData={selectedZone}
      />
    </>
  );
}
