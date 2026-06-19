# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2025-08-XX

### Added
- Twilio SMS Reporting — submit incident reports via SMS
- Two-way SMS replies — admins can reply to SMS reporters from the dashboard
- Gemini AI image analysis — automated disaster severity scoring and fake detection
- Gemini AI multilingual translation — translates Web + SMS reports from Nepali/Hindi/etc. to English
- Map deep linking for Push Notifications — clicking notification navigates to the incident on the map
- Spam Queue tab — AI-flagged fake reports separated into a dedicated admin view
- Volunteer Management page — dedicated admin dashboard for volunteer dispatch
- Broadcast push to selected volunteers from admin UI
- Geocoding endpoint — `/api/geocode/reverse` reverse geocoding via Nominatim
- Ping nearby volunteers endpoint — `POST /api/reports/:id/ping-volunteers`

## [1.2.0] - 2025-08-XX

### Added
- Offline queue with IndexedDB — reports queued when offline, auto-synced on reconnect
- Background Sync via SyncManager API — syncs pending reports even when tab is closed
- Emergency contacts cache — contacts stored in IndexedDB for offline viewing
- Map tile caching — CARTO basemap tiles cached via service worker for offline maps
- Profile editing with backend persistence
- i18next internationalization with 12 languages (English, Nepali, Hindi, Bhojpuri, Maithili, Tharu, Magar, Tamang, Newar, Chinese, Japanese, Korean)

### Fixed
- Signup GaPa detection accuracy
- Manage Users location filter

## [1.1.0] - 2025-08-XX

### Changed
- UI/UX overhaul across all pages
- Admin panel polish with skeleton loaders and responsive tables

### Added
- Custom SVG map and notification themes
- Vercel serverless deployment support
- Admin dashboard with Chart.js visualizations

## [1.0.0] - 2025-08-02

### Added
- Initial release with core features:
  - User registration and JWT authentication
  - Incident reporting with GPS location and photo upload
  - Interactive Leaflet map with clustered markers
  - Admin report management (CRUD, verify, status change)
  - Alert broadcasting with push notifications
  - Emergency contacts CRUD by department/location
  - Safe zone management (hospitals, shelters, police stations)
  - GPS → GaPa/NaPa detection using GeoJSON + Turf.js
  - PWA with service worker caching
  - Responsive mobile-first design
