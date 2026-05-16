import React, { useEffect, useState, useMemo } from "react";
import { Bar, Pie, Line } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from "chart.js";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import API from "../api/axios";
import useAdminLocationStore from "../stores/useAdminLocationStore";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState("");

  const { adminLocation, availableLocations } = useAdminLocationStore();

  useEffect(() => { if (adminLocation && !locationFilter) setLocationFilter(adminLocation); }, [adminLocation]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [rr, ur, ar] = await Promise.all([API.get("/reports"), API.get("/auth/users"), API.get("/alerts")]);
        setReports(rr.data); setUsers(ur.data); setAlerts(ar.data);
      } catch (err) { console.error("Error:", err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  // Filter data by location
  const filteredReports = useMemo(() => locationFilter ? reports.filter((r) => r.localGovName?.toLowerCase() === locationFilter.toLowerCase()) : reports, [reports, locationFilter]);
  const filteredAlerts = useMemo(() => locationFilter ? alerts.filter((a) => a.location?.toLowerCase().includes(locationFilter.toLowerCase())) : alerts, [alerts, locationFilter]);

  const statusCounts = useMemo(() => {
    const c = { pending: 0, verified: 0, solved: 0, working: 0 };
    filteredReports.forEach((r) => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [filteredReports]);

  const typeCounts = useMemo(() => {
    const c = {};
    filteredReports.forEach((r) => { c[r.type] = (c[r.type] || 0) + 1; });
    return c;
  }, [filteredReports]);

  const roleCounts = useMemo(() => users.reduce((a, u) => { a[u.role] = (a[u.role] || 0) + 1; return a; }, {}), [users]);

  const alertsByDate = useMemo(() => {
    const c = {};
    filteredAlerts.forEach((a) => { const d = new Date(a.timestamp).toLocaleDateString(); c[d] = (c[d] || 0) + 1; });
    return c;
  }, [filteredAlerts]);

  const Skeleton = () => <div className="bg-gray-200 animate-pulse rounded-lg h-48 w-full" />;

  const cards = [
    { label: "Total Reports", count: filteredReports.length, color: "text-indigo-700" },
    { label: "Pending", count: statusCounts.pending, color: "text-yellow-700" },
    { label: "Verified", count: statusCounts.verified, color: "text-blue-700" },
    { label: "Solved", count: statusCounts.solved, color: "text-green-700" },
    { label: "Working", count: statusCounts.working, color: "text-purple-700" },
    { label: "Total Users", count: users.length, color: "text-indigo-700" },
    { label: "Total Alerts", count: filteredAlerts.length, color: "text-orange-700" },
  ];

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-gray-400" />
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 shadow-sm">
            <option value="">All Locations</option>
            {availableLocations.map((loc) => (<option key={loc} value={loc}>{loc}</option>))}
          </select>
        </div>
      </motion.div>

      <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-10" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
        {cards.map((card, i) => (
          <motion.div key={i} className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">{card.label}</div>
            <div className={`text-2xl font-bold mt-1 ${card.color}`}>{loading ? "—" : card.count}</div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Reports by Status</h2>
          {loading ? <Skeleton /> : <Pie data={{ labels: Object.keys(statusCounts), datasets: [{ data: Object.values(statusCounts), backgroundColor: ["#facc15", "#3b82f6", "#10b981", "#a855f7"] }] }} />}
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Reports by Type</h2>
          {loading ? <Skeleton /> : <Bar data={{ labels: Object.keys(typeCounts), datasets: [{ label: "Reports", data: Object.values(typeCounts), backgroundColor: "#6366f1" }] }} options={{ responsive: true, plugins: { legend: { display: false } } }} />}
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Users by Role</h2>
          {loading ? <Skeleton /> : <Pie data={{ labels: Object.keys(roleCounts), datasets: [{ data: Object.values(roleCounts), backgroundColor: ["#f87171", "#60a5fa", "#34d399"] }] }} />}
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Alerts Over Time</h2>
          {loading ? <Skeleton /> : <Line data={{ labels: Object.keys(alertsByDate), datasets: [{ label: "Alerts", data: Object.values(alertsByDate), borderColor: "#f59e0b", backgroundColor: "rgba(251, 191, 36, 0.2)", tension: 0.3 }] }} />}
        </div>
      </div>
    </>
  );
}
