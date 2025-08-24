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
  addMinutes,
} from "date-fns";
import { SERVICE } from "../../constants";
import "./Dashboard.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLOT_MINUTES = 30;

/* Build "HH:mm" strings every N minutes between a/b */
function timeRange(a = "06:00", b = "22:00", step = 30) {
  const out = [];
  let [h, m] = a.split(":").map(Number);
  const [eh, em] = b.split(":").map(Number);
  while (h < eh || (h === eh && m <= em)) {
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    m += step;
    if (m >= 60) {
      m -= 60;
      h += 1;
    }
  }
  return out;
}

const TIME_OPTS = timeRange("07:00", "21:00", 30);

export default function Dashboard() {
  /* ===== Auth / barber id ===== */
  const [barberId, setBarberId] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setBarberId(data?.user?.id ?? null);
    })();
  }, []);

  /* ===== Calendar ===== */
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() =>
    startOfDay(new Date())
  );
  const [monthDays, setMonthDays] = useState([]);
  const todayStart = startOfDay(new Date());

  useEffect(() => {
    const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 0 });
    setMonthDays(eachDayOfInterval({ start, end }));
  }, [monthAnchor]);

  const pickDay = (day) => {
    setSelectedDate(day);
    loadAppointments(day);
  };

  /* ===== Appointments ===== */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const stats = useMemo(() => {
    const count = rows.length;
    const revenue = count * SERVICE.price;
    return { count, revenue };
  }, [rows]);

  function computeFinished(r) {
    if (
      !r ||
      r.status !== "approved" ||
      !r.appointment_date ||
      !r.appointment_time
    )
      return false;
    const t =
      r.appointment_time.length > 5
        ? r.appointment_time
        : `${r.appointment_time}:00`;
    const start = new Date(`${r.appointment_date}T${t}`);
    const end = addMinutes(start, SLOT_MINUTES);
    return new Date() > end;
  }

  async function loadAppointments(day = selectedDate) {
    if (!barberId) return;
    setLoading(true);
    setErr("");
    const dayStr = format(day, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        id,
        barber_id,
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
      .eq("barber_id", barberId)
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

  useEffect(() => {
    if (barberId) loadAppointments(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberId]);

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
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
      );
    }
  };

  const cancelAndDelete = async (id) => {
    setErr("");
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) {
      console.error(error);
      setErr(error.message || "Could not cancel appointment.");
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const selDateLabel = format(selectedDate, "EEE d MMM, yyyy");

  /* ===== Availability editor ===== */
  // availabilityState[0..6] -> { enabled, start, end }
  const [availabilityState, setAvailabilityState] = useState(() =>
    Array.from({ length: 7 }, (_, i) => ({
      enabled: false,
      start: "09:00",
      end: "17:00",
    }))
  );
  const [savingAvail, setSavingAvail] = useState(false);

  const loadAvailability = async () => {
    if (!barberId) return;
    const { data, error } = await supabase
      .from("availability")
      .select("day_of_week, start_time, end_time")
      .eq("barber_id", barberId);

    if (!error) {
      const next = Array.from({ length: 7 }, () => ({
        enabled: false,
        start: "09:00",
        end: "17:00",
      }));

      (data || []).forEach((r) => {
        const d = Number(r.day_of_week);
        if (d >= 0 && d <= 6) {
          next[d] = {
            enabled: !!(r.start_time && r.end_time),
            start: (r.start_time || "09:00").slice(0, 5),
            end: (r.end_time || "17:00").slice(0, 5),
          };
        }
      });
      setAvailabilityState(next);
    }
  };

  useEffect(() => {
    if (barberId) loadAvailability();
  }, [barberId]);

  const updateDay = (idx, patch) => {
    setAvailabilityState((prev) => {
      const copy = prev.slice();
      copy[idx] = { ...copy[idx], ...patch };
      return copy;
    });
  };

  const saveAvailability = async () => {
    if (!barberId) return;
    setSavingAvail(true);
    setErr("");

    try {
      // For each day: if enabled & start<end -> delete+insert
      // else delete existing row for that day
      const tasks = availabilityState.map(async (row, day) => {
        // normalize
        const valid =
          row.enabled &&
          row.start &&
          row.end &&
          row.start !== row.end &&
          row.start < row.end;

        // clear existing for this day
        await supabase
          .from("availability")
          .delete()
          .eq("barber_id", barberId)
          .eq("day_of_week", day);

        if (valid) {
          await supabase.from("availability").insert({
            barber_id: barberId,
            day_of_week: day,
            start_time: row.start,
            end_time: row.end,
          });
        }
      });

      await Promise.all(tasks);
      await loadAvailability();
    } catch (e) {
      console.error(e);
      setErr("Failed saving availability.");
    } finally {
      setSavingAvail(false);
    }
  };

  return (
    <div className="admin">
      <div className="admin__grid">
        {/* LEFT: Calendar */}
        <section className="admin__panel">
          <header className="admin__section">
            <h2 className="admin__title">Pick a day</h2>
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
              {WEEKDAYS.map((d) => (
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
                    // pointer for interactable, default for muted cells
                    style={{ cursor: inMonth ? "pointer" : "default" }}
                  >
                    <span className="month__date">{format(day, "d")}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* RIGHT: Appointments list */}
        <section className="admin__panel">
          <header className="admin__section admin__section--tight">
            <h2 className="admin__title">Appointments</h2>
            <p className="admin__hint">
              <strong>{format(selectedDate, "EEE d MMM, yyyy")}</strong>
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
                {rows.map((r) => {
                  const finished = computeFinished(r);
                  const uiStatus = finished ? "finished" : r.status;

                  return (
                    <tr key={r.id}>
                      <td className="mono">{r.appointment_time}</td>
                      <td>
                        <div className="admin__cust">
                          <strong className="admin__custName">
                            {r.guest_name}
                          </strong>
                          <span className="admin__custMeta">
                            {r.guest_phone} • {r.guest_email}
                          </span>
                        </div>
                      </td>
                      <td className={`admin__status ${uiStatus}`}>
                        {uiStatus}
                      </td>
                      <td className="admin__notes">{r.notes}</td>
                      <td className="admin__actions">
                        {uiStatus !== "approved" && uiStatus !== "finished" && (
                          <button
                            onClick={() => approve(r.id)}
                            className="btn btn--ok"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => cancelAndDelete(r.id)}
                          className="btn btn--danger"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

        {/* BOTTOM: Working hours / Availability */}
        <section className="admin__panel admin__panel--wide">
          <header className="admin__section">
            <h2 className="admin__title">Working hours</h2>
            <p className="admin__hint">
              Choose the days you work and a start/end time.
            </p>
          </header>

          <div className="avail">
            {WEEKDAYS.map((label, i) => {
              const row = availabilityState[i];
              return (
                <div className="avail__row" key={label}>
                  <label className="avail__day">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) =>
                        updateDay(i, { enabled: e.target.checked })
                      }
                    />
                    <span>{label}</span>
                  </label>

                  <div className="avail__times">
                    <select
                      className="avail__select"
                      value={row.start}
                      onChange={(e) => updateDay(i, { start: e.target.value })}
                      disabled={!row.enabled}
                    >
                      {TIME_OPTS.map((t) => (
                        <option key={`s-${i}-${t}`} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    <span className="avail__sep">to</span>

                    <select
                      className="avail__select"
                      value={row.end}
                      onChange={(e) => updateDay(i, { end: e.target.value })}
                      disabled={!row.enabled}
                    >
                      {TIME_OPTS.map((t) => (
                        <option key={`e-${i}-${t}`} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="avail__actions">
            <button
              className="btn btn--primary"
              onClick={saveAvailability}
              disabled={savingAvail || !barberId}
            >
              {savingAvail ? "Saving…" : "Save working hours"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
