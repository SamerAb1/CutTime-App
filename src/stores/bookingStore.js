import { makeAutoObservable, runInAction } from "mobx";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { supabase } from "../supabase-client";

function toHHMM(t) {
  const s = String(t || "");
  return s.length >= 5 ? s.slice(0, 5) : s;
}
function* timeRange(dateObj, startHHMM, endHHMM, stepMin = 30) {
  const [sh, sm] = startHHMM.split(":").map(Number);
  const [eh, em] = endHHMM.split(":").map(Number);
  const start = new Date(dateObj);
  start.setHours(sh, sm, 0, 0);
  const end = new Date(dateObj);
  end.setHours(eh, em, 0, 0);
  for (
    let d = new Date(start);
    d < end;
    d = new Date(d.getTime() + stepMin * 60 * 1000)
  ) {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    yield `${hh}:${mm}`;
  }
}

class BookingStore {
  availability = []; // { day_of_week, start_time, end_time, barber_id }
  bookedMap = new Map(); // "yyyy-MM-dd" -> Set("HH:mm")
  slots = []; // free-only times

  selectedDate = null;
  selectedTime = null;
  loading = false;
  error = null;

  barberId = import.meta.env.VITE_BARBER_ID || "";

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async loadCalendar(anchorDate = new Date()) {
    this.error = null;
    this.loading = true;
    try {
      await this.loadAvailability();
      const start = startOfMonth(anchorDate);
      const end = addDays(endOfMonth(anchorDate), 7);
      await this.loadBookedForRange(start, end);
    } catch (e) {
      runInAction(() => (this.error = e.message || "Failed to load calendar."));
    } finally {
      runInAction(() => (this.loading = false));
    }
  }

  async loadAvailability() {
    const { data, error } = await supabase
      .from("availability")
      .select("day_of_week, start_time, end_time, barber_id")
      .eq("barber_id", this.barberId);
    if (error) throw error;
    runInAction(() => {
      this.availability = data || [];
    });
  }

  async loadBookedForRange(start, end) {
    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("booked_slots")
      .select("appointment_date, appointment_time, barber_id")
      .eq("barber_id", this.barberId)
      .gte("appointment_date", startStr)
      .lte("appointment_date", endStr);

    if (error) throw error;

    const map = new Map();
    (data || []).forEach((r) => {
      const d = format(new Date(r.appointment_date), "yyyy-MM-dd");
      const t = String(r.appointment_time).slice(0, 5); // "HH:MM"
      if (!map.has(d)) map.set(d, new Set());
      map.get(d).add(t);
    });

    this.bookedMap = map;
    if (this.selectedDate) this.computeSlotsForDay();
  }

  setSelectedDate(d) {
    this.selectedDate = d;
    this.selectedTime = null;
    this.computeSlotsForDay();
  }
  setSelectedTime(t) {
    this.selectedTime = t;
  }

  computeSlotsForDay() {
    if (!this.selectedDate) {
      this.slots = [];
      return;
    }
    const dow = this.selectedDate.getDay();
    const row = this.availability.find((r) => r.day_of_week === dow);
    if (!row) {
      this.slots = [];
      return;
    }

    const toHHMM = (t) => String(t || "").slice(0, 5);
    const all = Array.from(
      timeRange(
        this.selectedDate,
        toHHMM(row.start_time),
        toHHMM(row.end_time),
        30
      )
    );

    const dateStr = format(this.selectedDate, "yyyy-MM-dd");
    const taken = this.bookedMap.get(dateStr) ?? new Set();

    const now = new Date();
    const isToday =
      format(this.selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");

    const free = all.filter((t) => {
      if (taken.has(t)) return false;
      if (isToday) {
        const [hh, mm] = t.split(":").map(Number);
        const dt = new Date(this.selectedDate);
        dt.setHours(hh, mm, 0, 0);
        return dt > now; // hide past times today
      }
      return true;
    });

    this.slots = free;
  }

  // bookingStore.js — bookGuest()
  async bookGuest({ name, email, phone, notes }) {
    if (!this.barberId)
      throw new Error("Barber is not configured. Set VITE_BARBER_ID.");

    if (!this.selectedDate || !this.selectedTime) {
      throw new Error("No day/time selected.");
    }

    const payload = {
      barber_id: this.barberId,
      appointment_date: format(this.selectedDate, "yyyy-MM-dd"),
      appointment_time: this.selectedTime, // "HH:MM"
      guest_name: name.trim(),
      guest_email: email.trim().toLowerCase(),
      guest_phone: phone.trim(),
      notes: (notes || "").trim() || null,
    };

    // Don't .select() here — anon has no SELECT policy on appointments
    const { error } = await supabase
      .from("appointments")
      .insert(payload, { returning: "minimal" });

    if (error) {
      // Unique-slot constraint protection
      if (
        error.code === "23505" ||
        /duplicate|unique/i.test(error.message || "")
      ) {
        await this.refreshAfterBookingChange();
        throw new Error("Sorry, that slot was just taken. Pick another time.");
      }
      throw error;
    }

    // Refresh taken slots after a successful insert
    await this.refreshAfterBookingChange();
    return true;
  }

  async refreshAfterBookingChange() {
    if (!this.selectedDate) return;
    const start = startOfMonth(this.selectedDate);
    const end = endOfMonth(this.selectedDate);
    await this.loadBookedForRange(start, end);
  }
}

export const bookingStore = new BookingStore();
