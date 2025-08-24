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
  // Calendar state
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(new Date())
  );
  const todayStart = startOfDay(new Date());
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  // Data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const stats = useMemo(() => {
    const count = rows.length;
    const revenue = count * SERVICE.price;
    return { count, revenue };
  }, [rows]);

  // Load appointments for selected day
  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        id,
        appointment_time,
        status,
        notes,
        guest_name,
        guest_phone,
        customer:customer_id (name, phone)
      `
      )
      .eq("appointment_date", selectedDateStr)
      .order("appointment_time");

    if (!error) setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Cancel (delete) an appointment
  async function cancel(id) {
    await supabase.from("appointments").delete().eq("id", id);
    await load();
  }

  // Build month grid
  const monthDays = (() => {
    const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  })();

  return (
    <div className="admin">
      <div className="admin__overlay" />
      <div className="admin__inner">
        <header className="admin__header">
          <h2>Appointments • {format(selectedDate, "MMM d, yyyy")}</h2>
          <p className="admin__stats">
            📅 {stats.count} Appointments | 💰 ${stats.revenue} Revenue
          </p>
        </header>

        {/* Calendar */}
        <section className="admin__panel">
          <div className="month">
            <div className="month__header">
              <button
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
                const isPast = day < todayStart;
                const active = isSameDay(day, selectedDate);

                const classes = [
                  "month__cell",
                  !inMonth && "month__cell--muted",
                  isPast && "month__cell--past",
                  active && "month__cell--active",
                  inMonth && !isPast && "month__cell--open",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    key={+day}
                    className={classes}
                    disabled={!inMonth}
                    onClick={() => !isPast && setSelectedDate(startOfDay(day))}
                  >
                    <span className="month__date">{format(day, "d")}</span>
                    {inMonth && !isPast && <span className="month__dot" />}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="admin__panel">
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
                {rows.length ? (
                  rows.map((r) => {
                    const name = r.customer?.name || r.guest_name || "—";
                    const phone = r.customer?.phone || r.guest_phone || "";
                    return (
                      <tr key={r.id}>
                        <td>{r.appointment_time}</td>
                        <td>
                          {name} {phone && <small>({phone})</small>}
                        </td>
                        <td>{r.status}</td>
                        <td>{r.notes}</td>
                        <td className="admin__actions">
                          <button
                            className="btn btn--danger"
                            onClick={() => cancel(r.id)}
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="admin__empty">
                      No appointments for this date
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
