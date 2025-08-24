import { useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
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
import { bookingStore } from "../stores/bookingStore";
import "./Booking.css";

export default observer(function Booking() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(null);
  const detailsRef = useRef(null);

  // Month shown in the calendar
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const todayStart = startOfDay(new Date());

  useEffect(() => {
    bookingStore.loadCalendar(monthAnchor);
  }, []); // on mount

  useEffect(() => {
    bookingStore.loadBookedForRange(
      startOfMonth(monthAnchor),
      endOfMonth(monthAnchor)
    );
  }, [monthAnchor]);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Weekdays we’re open (0..6)
  const openWeekday = useMemo(() => {
    const map = new Array(7).fill(false);
    (bookingStore.availability || []).forEach((row) => {
      if (
        typeof row.day_of_week === "number" &&
        row.start_time &&
        row.end_time
      ) {
        map[row.day_of_week] = true;
      }
    });
    return map;
  }, [bookingStore.availability]);

  // All cells to render for the visible month
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthAnchor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(monthAnchor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [monthAnchor]);

  const pickDay = (day) => {
    const isPast = day < todayStart;
    if (!isSameMonth(day, monthAnchor) || isPast || !openWeekday[day.getDay()])
      return;
    setErr(null);
    setOk(null);
    bookingStore.setSelectedDate(day);
  };

  const pickTime = (t) => {
    setErr(null);
    setOk(null);
    bookingStore.setSelectedTime(t);
    detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const book = async () => {
    setErr(null);
    setOk(null);
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const notes = form.notes.trim();
    const emailOk = /^[^\s"@]+@[^\s"@]+\.[^\s"@]+$/.test(email);

    if (!name || !emailOk || !phone) {
      setErr("Please enter your name, a valid email, and phone.");
      return;
    }
    if (!bookingStore.selectedDate || !bookingStore.selectedTime) {
      setErr("Pick a day and time first.");
      return;
    }
    try {
      await bookingStore.bookGuest({ name, email, phone, notes });
      setOk("Booked! We’ll reach out to confirm.");
      setForm({ name: "", email: "", phone: "", notes: "" });
    } catch (e) {
      setErr(e.message || "Could not book this slot.");
    }
  };

  const selDate = bookingStore.selectedDate
    ? format(bookingStore.selectedDate, "EEE d MMM")
    : null;

  return (
    <div className="book">
      <div className="book__grid">
        {/* LEFT: calendar + slots */}
        <section className="book__panel">
          <header className="book__section">
            <h2 className="book__title">Pick a day</h2>
            <p className="book__hint">Browse the full month</p>
          </header>

          {/* Month calendar */}
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
                const isPast = day < todayStart;
                const isOpen = openWeekday[day.getDay()];
                const active =
                  bookingStore.selectedDate &&
                  isSameDay(day, bookingStore.selectedDate);

                const classes = [
                  "month__cell",
                  !inMonth && "month__cell--muted",
                  inMonth && isOpen && !isPast && "month__cell--open",
                  isPast && "month__cell--past",
                  active && "month__cell--active",
                ]
                  .filter(Boolean)
                  .join(" ");

                const disabled = !inMonth || !isOpen || isPast;

                return (
                  <button
                    key={+day}
                    type="button"
                    className={classes}
                    onClick={() => pickDay(day)}
                    disabled={disabled}
                    aria-pressed={active}
                  >
                    <span className="month__date">{format(day, "d")}</span>
                    {inMonth && isOpen && !isPast && (
                      <span className="month__dot" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time slots (store already filters out booked & past times) */}
          <header className="book__section book__section--tight">
            <h2 className="book__title">Pick a time</h2>
            {selDate && (
              <p className="book__hint">
                Showing times for <strong>{selDate}</strong>
              </p>
            )}
          </header>

          <div className="slots">
            {bookingStore.slots.length === 0 && (
              <div className="book__muted">No times left for this day.</div>
            )}
            {bookingStore.slots.map((time) => {
              const active = bookingStore.selectedTime === time;
              return (
                <button
                  key={time}
                  onClick={() => pickTime(time)}
                  className={["slot", active && "slot--active"]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={active}
                >
                  {time}
                </button>
              );
            })}
          </div>
        </section>

        {/* RIGHT: details + CTA */}
        <section className="book__panel" ref={detailsRef}>
          <header className="book__section">
            <h2 className="book__title">Your details</h2>
          </header>

          <div className="book__summary">
            {bookingStore.selectedDate && bookingStore.selectedTime ? (
              <>
                <span className="book__badge">SELECTED</span>
                <strong>
                  {selDate} @ {bookingStore.selectedTime}
                </strong>
              </>
            ) : (
              <span className="book__muted">
                Select a day and time to continue
              </span>
            )}
          </div>

          <div className="form">
            <input
              name="name"
              placeholder="Full name"
              value={form.name}
              onChange={onChange}
              autoComplete="name"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={onChange}
              autoComplete="email"
            />
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              placeholder="05xxxxxxxx"
              pattern="^05\\d{8}$"
              maxLength={10}
              title="Phone must be exactly 10 digits and start with 05"
              value={form.phone}
              onChange={(e) => {
                // keep only digits, clamp to 10
                const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                setForm((f) => ({ ...f, phone: digits }));
              }}
            />

            <textarea
              name="notes"
              rows={3}
              placeholder="Notes (optional)"
              value={form.notes}
              onChange={onChange}
            />

            {err && <div className="book__error">{err}</div>}
            {ok && <div className="book__ok">{ok}</div>}

            <button
              className="btn btn--primary btn--xl book__cta"
              disabled={
                !bookingStore.selectedDate || !bookingStore.selectedTime
              }
              onClick={book}
            >
              Book this time
            </button>
            <small className="book__muted">We’ll reach out to confirm.</small>
          </div>
        </section>
      </div>
    </div>
  );
});
