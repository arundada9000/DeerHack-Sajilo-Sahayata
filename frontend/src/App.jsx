import React from "react";
import AppRoutes from "./routes/AppRoutes";
import { useLocalGovernment } from "./hooks/useLocalGovernment";
import usePushNotifications from "./hooks/usePushNotifications";
import useAuth from "./stores/useAuth";
import { useEffect } from "react";

const App = () => {
  useEffect(() => {
    useAuth.getState().autoLogin();
  }, []);
  useLocalGovernment();
  // Auto-subscribe to push notifications on app load (unless user opted out)
  usePushNotifications();
  return <AppRoutes />;
};

export default App;

