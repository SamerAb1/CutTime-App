import { useEffect, useState } from "react";
import { HashRouter as BrowserRouter, Routes, Route } from "react-router-dom";

import { supabase } from "./supabase-client";
import "./App.css";

import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Booking from "./pages/Booking";
import Confirmation from "./pages/Confirmation";
import Dashboard from "./pages/admin/Dashboard";
import Availability from "./pages/admin/Availability";
import NotFound from "./pages/NotFound";
import RequireBarber from "./routes/RequireBarber";

export default function App() {
  // NEW: wait for Supabase to restore the session from storage
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 1) resolve cached session immediately on mount
    supabase.auth.getSession().then(() => {
      if (mounted) setAuthReady(true);
    });

    // 2) also mark ready on any auth state change (login/logout/refresh)
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (mounted) setAuthReady(true);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
      <Navbar />
      <div className="runebar" />
      {authReady ? (
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/book" element={<Booking />} />
          <Route path="/confirm" element={<Confirmation />} />
          <Route
            path="/admin"
            element={
              <RequireBarber>
                <Dashboard />
              </RequireBarber>
            }
          />
          <Route
            path="/admin/availability"
            element={
              <RequireBarber>
                <Availability />
              </RequireBarber>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      ) : (
        // tiny placeholder while we wait ~instant for session hydration
        <div style={{ padding: 24, textAlign: "center", color: "#e8eef6" }}>
          Loading…
        </div>
      )}
    </BrowserRouter>
  );
}
