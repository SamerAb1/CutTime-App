import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabase-client";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  startOfDay,
} from "date-fns";
import { SERVICE } from "../../constants";
import "./Dashboard.css";

export default function Dashboard() {
  // calendar state
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(new Date())
  );
  const [monthDays, setMonthDays] = useState([]);
  const todayStart = startOfDay(new Date());

  // data state
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const stats = useMemo(() => {
    const count = rows.length;
    const revenue = count * SERVICE.price;
    return { count, revenue };
  }, [rows]);

  // build month grid whenever the anchor changes
  useEffect(() => {
    const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 0 });
    setMonthDays(eachDayOfInterval({ start, end }));
  }, [monthAnchor]);

  // load appointments for the selected day
  async function loadAppointments(day = selectedDate) {
    setLoading(true);
    setErr("");
    const dayStr = format(day, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        id,
        appointment_date,
        appointment_time,
        status,
        notes,
        guest_name,
        guest_email,
        guest_phone
      `
      )
      .eq("appointment_date", dayStr)
      .order("appointment_time", { ascending: true });

    if (error) {
      console.error("Admin load error:", error);
      setErr(error.message || "Failed to load appointments.");
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }

  // initial load
  useEffect(() => {
    loadAppointments(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickDay = (day) => {
    // admin can view past/future days; no need to block past
    setSelectedDate(day);
    loadAppointments(day);
  };

  const approve = async (id) => {
    setErr("");
    const { error } = await supabase
      .from("appointments")
      .update({ status: "approved" })
      .eq("id", id);
    if (error) {
      console.error(error);
      setErr(error.message || "Could not approve appointment.");
    } else {
      loadAppointments(selectedDate);
    }
  };

  const cancelAndDelete = async (id) => {
    setErr("");
    // If you prefer keeping history, update to "cancelled" first (or only):
    // await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      console.error(error);
      setErr(error.message || "Could not cancel appointment.");
    } else {
      loadAppointments(selectedDate);
    }
  };

  const selDateLabel = format(selectedDate, "EEE d MMM, yyyy");

  return (
    <div className="admin">
      {/* Background overlay handled in CSS */}

      <div className="admin__grid">
        {/* LEFT: Calendar */}
        <section className="admin__panel">
          <header className="admin__section">
            <h2 className="admin__title">Pick a day</h2>
            <p className="admin__hint">Browse the full month</p>
          </header>

          <div className="month">
            <div className="month__header">
              <button
                type="button"
                className="month__nav"
                aria-label="Previous month"
                onClick={() => setMonthAnchor((d) => subMonths(d, 1))}
              >
                ‹
              </button>
              <div className="month__title">
                {format(monthAnchor, "MMMM yyyy")}
              </div>
              <button
                type="button"
                className="month__nav"
                aria-label="Next month"
                onClick={() => setMonthAnchor((d) => addMonths(d, 1))}
              >
                ›
              </button>
            </div>

            <div className="month__weekdays">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="month__weekday">
                  {d}
                </div>
              ))}
            </div>

            <div className="month__grid">
              {monthDays.map((day) => {
                const inMonth = isSameMonth(day, monthAnchor);
                const isToday = isSameDay(day, todayStart);
                const active = isSameDay(day, selectedDate);

                const classes = [
                  "month__cell",
                  !inMonth && "month__cell--muted",
                  active && "month__cell--active",
                  isToday && "month__cell--today",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    key={+day}
                    type="button"
                    className={classes}
                    onClick={() => pickDay(day)}
                    aria-pressed={active}
                  >
                    <span className="month__date">{format(day, "d")}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* RIGHT: List + stats */}
        <section className="admin__panel">
          <header className="admin__section admin__section--tight">
            <h2 className="admin__title">Appointments</h2>
            <p className="admin__hint">
              Showing for <strong>{selDateLabel}</strong>
            </p>
          </header>

          <p className="admin__stats">
            📅 {stats.count} Appointments | 💰 ${stats.revenue} Revenue
          </p>

          {err && <div className="admin__error">{err}</div>}

          {loading ? (
            <div className="admin__muted">Loading…</div>
          ) : (
            <table className="admin__table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.appointment_time}</td>
                    <td>
                      <div className="admin__cust">
                        <strong>{r.guest_name}</strong>
                        <small>
                          {r.guest_phone} · {r.guest_email}
                        </small>
                      </div>
                    </td>
                    <td>{r.status}</td>
                    <td className="admin__notes">{r.notes}</td>
                    <td className="admin__actions">
                      <button
                        onClick={() => approve(r.id)}
                        className="btn btn--ok"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => cancelAndDelete(r.id)}
                        className="btn btn--danger"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={5} className="admin__empty">
                      No appointments for this day
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
