import { useEffect, useState } from "react";
import { supabase } from "../../supabase-client";
import { DOW_NAMES } from "../../utils/slots";
import "./Availability.css";

export default function Availability() {
  const [rows, setRows] = useState([]);
  const [barberId, setBarberId] = useState(null);

  const loadBarberAndRows = async () => {
    const { data: b } = await supabase
      .from("users")
      .select("user_id")
      .eq("role", "barber")
      .limit(1);
    const bid = b?.[0]?.user_id;
    setBarberId(bid || null);
    const { data } = await supabase
      .from("availability")
      .select("*")
      .eq("barber_id", bid)
      .order("day_of_week");
    setRows(data ?? []);
  };
  useEffect(() => {
    loadBarberAndRows();
  }, []);

  const rowFor = (dow) => rows.find((r) => r.day_of_week === dow);
  const setVal = (dow, field, val) => {
    setRows((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((r) => r.day_of_week === dow);
      if (idx === -1)
        copy.push({
          day_of_week: dow,
          start_time: "09:00",
          end_time: "17:00",
          [field]: val,
        });
      else copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const save = async () => {
    if (!barberId) return;
    for (const r of rows) {
      await supabase.from("availability").upsert({
        barber_id: barberId,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
      });
    }
    alert("Saved");
  };

  return (
    <div>
      <h2>Weekly Availability</h2>
      <table className="avail__table">
        <thead>
          <tr>
            <th>Day</th>
            <th>Start</th>
            <th>End</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
            const r = rowFor(dow) || { start_time: "", end_time: "" };
            return (
              <tr key={dow}>
                <td>{DOW_NAMES[dow]}</td>
                <td>
                  <input
                    value={r.start_time}
                    onChange={(e) => setVal(dow, "start_time", e.target.value)}
                    placeholder="09:00 or empty for closed"
                  />
                </td>
                <td>
                  <input
                    value={r.end_time}
                    onChange={(e) => setVal(dow, "end_time", e.target.value)}
                    placeholder="17:00 or empty for closed"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="avail__save">
        <button onClick={save}>Save</button>
      </div>
    </div>
  );
}
