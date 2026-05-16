import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Phone, BellRing } from "lucide-react";
import API from "../../api/axios";
import OfflineSyncBanner from "../../components/OfflineSyncBanner";

// Fetch reports from backend
const fetchReports = async () => {
  const { data } = await API.get("/reports");
  return data;
};

// Fetch alerts from backend
const fetchAlerts = async () => {
  const { data } = await API.get("/alerts");
  return data.map((alert) => ({
    type: alert.type,
    location: alert.location || "Unknown area",
    description: alert.description,
    timeAgo: new Date(alert.timestamp).toLocaleTimeString(),
  }));
};

// Nominatim Reverse Geocoding fetcher (with rate limit awareness)
const fetchReverseGeocode = async (lat, lon) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
  );
  if (!res.ok) throw new Error("Geocoding failed");
  const json = await res.json();
  return json.display_name;
};

const Dashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState("all");
  const [sortOrder] = useState("latest");
  const [expandedLocationId, setExpandedLocationId] = useState(null);

  // 1. Fetch Alerts (React Query)
  const { data: notifications = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: fetchAlerts,
    staleTime: 60 * 1000, // 1 minute
  });

  // 2. Fetch Reports (React Query)
  const { data: incidents = [], isLoading: loadingIncidents } = useQuery({
    queryKey: ["reports"],
    queryFn: fetchReports,
    staleTime: 60 * 1000,
  });

  // 3. Fetch Geolocation Data for all incidents (React Query)
  // useQueries runs these in parallel but caches them globally
  const locationQueries = useQueries({
    queries: incidents.map((incident) => {
      const coords = incident.location?.coordinates;
      const isValidCoords = coords && coords.length === 2;
      
      let lat = null, lng = null;
      if (isValidCoords) {
        // Nepal Lat is ~26-30, Lng is ~80-88
        // If coords[0] is > 70, it's the longitude (new format [lng, lat])
        if (coords[0] > 70) {
          lng = coords[0];
          lat = coords[1];
        } else {
          // Old format [lat, lng]
          lat = coords[0];
          lng = coords[1];
        }
      }

      return {
        queryKey: ["geocode", isValidCoords ? `${lat},${lng}` : incident._id],
        queryFn: () => (isValidCoords ? fetchReverseGeocode(lat, lng) : null),
        enabled: isValidCoords,
        staleTime: Infinity,
        retry: 1,
      };
    }),
  });

  // Build a map of incident ID to location name from the queries
  const locationNames = {};
  incidents.forEach((incident, index) => {
    const query = locationQueries[index];
    if (query?.data) {
      locationNames[incident._id] = query.data;
    }
  });

  // Filter & Sort Logic
  const filteredIncidents = incidents
    .filter((incident) => {
      const status = incident.status || "reported";
      return filterType === "all" || status === filterType;
    })
    .sort((a, b) =>
      sortOrder === "latest"
        ? new Date(b.timestamp) - new Date(a.timestamp)
        : new Date(a.timestamp) - new Date(b.timestamp)
    );

  const statusDotColor = {
    verified: "bg-red-500",
    working: "bg-yellow-500",
    solved: "bg-green-500",
    pending: "bg-orange-400",
  };

  const formatLocation = (incident) => {
    const location = incident.location;
    if (!location) return t("Unknown Location");
    if (locationNames[incident._id]) return locationNames[incident._id];
    if (typeof location === "string") return location;
    if (location.city && location.area) return `${location.area}, ${location.city}`;
    if (location.city) return location.city;
    return t("Unknown Location");
  };

  return (
    <>
      <Helmet>
        <title>Sajilo Sahayata | Dashboard</title>
        <meta
          name="description"
          content="View the latest emergency reports and alerts in your area."
        />
      </Helmet>

      {/* Offline Sync Banner */}
      <div className="px-4 pt-4 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto">
        <OfflineSyncBanner />
      </div>

      <motion.div
        className="mt-0 px-4 py-4 space-y-4 max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl min-h-full mx-auto bg-bg-card shadow-sm rounded-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        exit={{ opacity: 0, y: -20 }}
      >
        {/* Alerts Section */}
        {loadingAlerts ? (
          <Skeleton height={60} borderRadius={16} />
        ) : notifications.length > 0 ? (
          <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 p-2 scroll-smooth scrollbar-hide md:overflow-visible">
            <AnimatePresence>
              {notifications.map((notification, index) => (
                <motion.div
                  key={index}
                  className="min-w-[280px] md:min-w-0 bg-accent-yellow text-black p-5 rounded-3xl shadow-sm relative border border-yellow-200"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  role="alert"
                  aria-live="polite"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <BellRing size={16} className="text-primary-red" />
                    <strong className="text-primary-red font-extrabold tracking-wide uppercase text-xs">
                      {t("Notification!")}
                    </strong>
                  </div>
                  <p className="text-sm text-text-dark font-medium mt-1">
                    {notification.timeAgo}, a {notification.type} was reported in{" "}
                    {notification.location}.
                  </p>
                  <p className="text-xs mt-1.5 text-gray-800 opacity-90">
                    {notification.description}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : null}

        {/* Reports Section */}
        <div className="space-y-3 mt-8">
          <div className="flex justify-between items-center rounded-lg px-1">
            <h2 className="text-2xl font-bold text-text-dark tracking-tight">
              {t("dashboard.latestReports")}
            </h2>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-gray-50 transition"
              aria-label="Filter incidents by status"
            >
              <option value="all">{t("dashboard.All")}</option>
              <option value="verified">{t("dashboard.Verified")}</option>
              <option value="working">{t("dashboard.Working")}</option>
              <option value="solved">{t("dashboard.Solved")}</option>
              <option value="pending">{t("dashboard.Pending")}</option>
            </select>
          </div>

          {loadingIncidents ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
              <div className="h-80 w-full rounded-3xl overflow-hidden shadow-sm">
                <Skeleton className="w-full h-full" />
              </div>
            </div>
          ) : filteredIncidents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm text-gray-500 border border-gray-100">
              {t("No incidents reported yet.")}
            </div>
          ) : (
            <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 p-2 scrollbar-hide md:overflow-visible pb-6">
              <AnimatePresence>
                {filteredIncidents.map((incident, index) => {
                  const status = incident.status || "reported";
                  const queryIndex = incidents.findIndex((i) => i._id === incident._id);
                  const isGeoLoading = locationQueries[queryIndex]?.isLoading;

                  return (
                    <motion.div
                      key={incident._id}
                      className="relative min-w-[270px] md:min-w-0 rounded-[2rem] shadow-sm bg-white p-4 border border-gray-100 flex flex-col h-full snap-center hover:shadow-md transition-shadow"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="relative overflow-hidden rounded-2xl group">
                        <img
                          src={incident.imageUrl?.startsWith("http") ? incident.imageUrl : `${import.meta.env.VITE_API_URL.replace("/api", "")}${incident.imageUrl}`}
                          alt={incident.type}
                          loading="lazy"
                          className="h-56 w-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-500"
                          onClick={() => {
                            const c = incident.location.coordinates;
                            const isValid = c && c.length === 2;
                            let lat = 0, lng = 0;
                            if (isValid) {
                              if (c[0] > 70) {
                                lng = c[0];
                                lat = c[1];
                              } else {
                                lat = c[0];
                                lng = c[1];
                              }
                            }
                            navigate("/dashboard/map", {
                              state: {
                                focus: {
                                  id: incident._id,
                                  lat,
                                  lng,
                                  title: incident.title,
                                  type: incident.type,
                                },
                              },
                            });
                          }}
                        />

                        {/* Location label */}
                        <div
                          className="absolute bottom-3 left-3 max-w-[85%] cursor-pointer"
                          onClick={() =>
                            setExpandedLocationId(
                              expandedLocationId === incident._id ? null : incident._id
                            )
                          }
                          aria-expanded={expandedLocationId === incident._id}
                        >
                          <div
                            className={`text-white transition-all duration-300 ${
                              expandedLocationId === incident._id
                                ? "bg-black/90 text-[11px] px-3 py-2 rounded-xl shadow-lg z-10 whitespace-normal backdrop-blur-md"
                                : "bg-black/60 backdrop-blur-md text-[10px] px-3 py-1.5 rounded-lg truncate shadow-sm hover:bg-black/80"
                            }`}
                          >
                            {isGeoLoading ? (
                              <Skeleton width={80} height={12} baseColor="#333" highlightColor="#555" />
                            ) : (
                              formatLocation(incident)
                            )}
                          </div>
                        </div>

                        {/* Status Dot */}
                        <div
                          className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                            statusDotColor[status] || "bg-gray-400"
                          }`}
                          title={`Status: ${status}`}
                        ></div>
                      </div>

                      <div className="pt-4 pb-1 px-2 flex-grow flex flex-col">
                        <div className="text-[15px] font-black capitalize text-gray-900 tracking-tight">
                          {t(`incidentTypes.${incident.type}`)}
                        </div>
                        <p className="text-[13px] text-gray-600 mt-2 line-clamp-3 leading-relaxed flex-grow">
                          {incident.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* SOS Button */}
        <motion.div
          className="bg-primary-red mt-6 mb-24 p-1 rounded-full shadow-lg border border-red-500/20"
          animate={{ scale: [1, 1.015, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        >
          <motion.button
            className="flex items-center justify-center gap-3 bg-primary-red text-white font-bold text-3xl sm:text-4xl w-full rounded-full shadow-inner hover:bg-primary-red-hover transition-colors py-3 sm:py-4 px-6 focus:outline-none focus:ring-4 focus:ring-red-300"
            onClick={() => navigate("/dashboard/emergency-type-selection")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            aria-label="Call for emergency assistance"
          >
            <Phone size={36} strokeWidth={2.5} className="animate-pulse drop-shadow-md sm:w-12 sm:h-12" />
            <span className="tracking-wide">{t("dashboard.sahayatacall")}</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  );
};

export default Dashboard;
