import { BrowserRouter, Routes, Route } from "react-router-dom";
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
  return (
    <BrowserRouter>
      <Navbar />
      <div className="runebar" />
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
    </BrowserRouter>
  );
}
