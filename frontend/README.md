# Sajilo Sahayata — Frontend

**React PWA for Disaster Reporting & Coordination**

[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-purple)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-blue)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-5-orange)](https://zustand.docs.pmnd.rs/)

---

## Tech Stack

| Category | Choice |
|---|---|
| **UI Framework** | React 18.3 |
| **Build Tool** | Vite 6.3 |
| **CSS** | Tailwind CSS v4 (with `@tailwindcss/vite` plugin) |
| **Animation** | Framer Motion 12 |
| **State (Client)** | Zustand 5 |
| **State (Server)** | TanStack React Query 5 |
| **Routing** | React Router v7 |
| **HTTP** | Axios (interceptors for JWT) |
| **Maps** | Leaflet 1.9 + React-Leaflet 4 + MarkerCluster |
| **Charts** | Chart.js 4 + react-chartjs-2 |
| **i18n** | i18next 25 + react-i18next 15 |
| **Icons** | Lucide React |
| **Notifications** | React Hot Toast |
| **PWA** | Service Worker (custom `sw.js`) |
| **Geospatial** | Turf.js |
| **Date** | Day.js |

---

## Features

- **Incident Reporting** — Live photo from camera/gallery + auto GPS location
- **Offline Queue** — Reports queued in IndexedDB, auto-synced via Background Sync
- **Emergency Contacts** — Department-specific contacts cached offline
- **Interactive Map** — Clustered Leaflet map with type-colored markers
- **Push Notifications** — Web push for admin alerts
- **9 Languages** — English, Nepali, Hindi, Bhojpuri, Magar, Maithili, Newar, Tamang, Tharu
- **Admin Panel** — Dashboard, user/report/alert/contact/safezone management
- **Code Splitting** — Route-based lazy loading + Vite manual chunks

---

## Folder Structure

```
frontend/
├── public/
│   ├── sw.js                 # Service Worker (cache strategy, push, sync)
│   └── logos/                # PWA icons
├── src/
│   ├── Admin/                # Admin pages
│   │   ├── Dashboard.jsx
│   │   ├── Manage-Users.jsx
│   │   ├── Manage-Reports.jsx
│   │   ├── ManageContacts.jsx
│   │   ├── ManageSafeZones.jsx
│   │   └── SendAlerts.jsx
│   ├── Auth/                 # Auth guard (RequireAdmin)
│   ├── api/
│   │   └── axios.js          # Axios instance with JWT interceptor
│   ├── components/
│   │   ├── admin/            # Admin sub-components (FilterBar, Pagination, etc.)
│   │   ├── charts/           # Chart.js wrappers
│   │   ├── AlertModal.jsx
│   │   ├── DetailModal.jsx
│   │   ├── ErrorBoundary.jsx
│   │   ├── OfflineSyncBanner.jsx
│   │   ├── PageLoader.jsx
│   │   ├── ReportCard.jsx
│   │   ├── ReportDetailModal.jsx
│   │   ├── ReportEditModal.jsx
│   │   └── SummaryCard.jsx
│   ├── data/                 # Dummy/fixture reports
│   ├── hooks/
│   │   ├── useDebounce.js
│   │   ├── useImagePreview.jsx
│   │   ├── useLocalGovernment.js
│   │   └── usePushNotifications.js
│   ├── layouts/
│   │   ├── AdminLayout.jsx   # Sidebar + admin wrapper
│   │   └── Navigation.jsx    # Bottom nav for user dashboard
│   ├── locales/              # i18n translation JSON
│   │   ├── en/
│   │   ├── ne/
│   │   ├── bhojpuri/
│   │   ├── hindi/
│   │   ├── magar/
│   │   ├── maithili/
│   │   ├── newar/
│   │   ├── tamang/
│   │   └── tharu/
│   ├── pages/
│   │   ├── Admin/            # Lazy-loaded admin pages
│   │   ├── Auth/             # Login, Signup, VerifyOTP, ForgotPassword, Welcome
│   │   ├── Dashboard/        # Home, Alerts, Reports, Map, Profile, DynamicContact
│   │   └── Reports/
│   │       └── ReportForm.jsx
│   ├── routes/
│   │   └── AppRoutes.jsx     # All routes with lazy loading
│   ├── services/
│   │   ├── api.js            # Deprecated API service
│   │   └── firebase.js       # Firebase config
│   ├── stores/               # Zustand stores
│   │   ├── localGovStore.js  # GPS → GaPa cache (30 min expiry)
│   │   ├── useAuth.js        # Auth state (login/logout/autoLogin)
│   │   ├── useAuthStore.js   # Legacy demo store
│   │   ├── useAdminLocationStore.js
│   │   ├── useRegistration.js
│   │   └── UsePreference.jsx # Theme, font, language preferences
│   ├── utils/
│   │   ├── exportCsv.js      # CSV export utility
│   │   └── offlineQueue.js   # IndexedDB queue + Background Sync
│   ├── App.jsx
│   ├── i18n.js
│   ├── index.css
│   ├── main.jsx
│   └── Socket.jsx
├── index.html
├── vercel.json               # SPA rewrites
└── vite.config.js            # Vite config + chunk splitting
```

---

## Key Packages Explained

### `src/api/axios.js`
- Base URL from `VITE_API_URL`
- 30s timeout
- Request interceptor attaches `Bearer` token from `localStorage`

### `src/utils/offlineQueue.js`
- **IndexedDB** database (`sajilo-offline-db` v2) with two stores:
  - `offlineReports` — queued report submissions
  - `offlineContacts` — cached emergency contacts
- `saveReportOffline()` — saves report + registers Background Sync
- `syncPendingReports()` — replays queued reports to the API
- `cacheContacts()` / `getCachedContacts()` — emergency contact offline cache
- Background Sync registration via `navigator.serviceWorker.ready.sync.register("sync-reports")`

### `public/sw.js`
- **Install**: Pre-caches core shell (index.html, icons)
- **Activate**: Cleans old caches
- **Fetch Strategy**:
  - CARTO map tiles → Cache-first
  - API calls (`/api/...`) → Network-first with cache fallback
  - Static assets → Cache-first with network fallback
  - Navigation requests → serve `/index.html` when offline (SPA fallback)
- **Push**: Displays push notifications with View/Dismiss actions
- **Background Sync**: Listens for `sync-reports` events, posts `SYNC_REPORTS` message to clients

### `src/stores/useAuth.js`
- `login(user, token)` — saves token to localStorage, sets state
- `logout()` — clears token, nulls user
- `autoLogin()` — calls `/auth/verify` on mount with `Authorization` header to restore session
- `updateUser(data)` — merges data into existing user (for profile edits)

### `src/stores/localGovStore.js`
- Caches GPS-detected GaPa/NaPa name with 30-minute expiry
- `setLocalGov(name, coords)` — stores with timestamp
- `getLocalGov()` / `getCoordinates()` — returns `null` if expired

### `src/stores/UsePreference.jsx`
- Persists theme (light/dark), font size, font family, language to `localStorage`
- Applied in `main.jsx` via `ApplyPreferences` wrapper component

### `src/routes/AppRoutes.jsx`
- All pages lazy-loaded with `React.lazy()` + `Suspense`
- Framer Motion `AnimatePresence` for page transitions
- Admin routes are grouped under `AdminLayout` with a stable route key to prevent remounting
- Dynamic contact route: `/dashboard/:localGov/:department`
- Catch-all route renders `NotFound`

### `vite.config.js`
- Manual chunk splitting for optimal caching:
  - `vendor-react` (react, react-dom, react-router-dom)
  - `vendor-ui` (framer-motion, lucide-react)
  - `vendor-map` (leaflet, react-leaflet, react-leaflet-cluster)
  - `vendor-data` (axios, @tanstack/react-query, zustand)
  - `vendor-chart` (chart.js, react-chartjs-2)
  - `vendor-i18n` (i18next, react-i18next)

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Backend API base URL (e.g. `http://localhost:3000/api`) |
| `VITE_FIREBASE_CONFIG` | No | Firebase config JSON for future push notification fallback |

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |

---

## PWA / Offline Support

The app is a full Progressive Web Application:

1. **Installable** — Service Worker registers on first visit; browser prompts install
2. **Offline Reports** — When offline, report submissions are saved to IndexedDB. On reconnect, `OfflineSyncBanner` shows a "Sync Now" button and auto-syncs
3. **Background Sync** — Even if the user closes the tab, the service worker fires a `sync` event when connectivity returns, triggering re-sync
4. **Contact Cache** — Emergency contacts fetched from the API are cached in IndexedDB. When offline, `DynamicContact.jsx` falls back to the cache with an amber "showing cached data" indicator
5. **Map Tiles** — CARTO basemap tiles are cached via a cache-first strategy, so the map works offline for previously viewed areas
