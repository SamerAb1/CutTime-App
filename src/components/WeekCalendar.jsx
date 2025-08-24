import { observer } from "mobx-react-lite";
import { format, addDays } from "date-fns";
import { DOW_NAMES } from "../utils/slots";
import "./WeekCalendar.css";

export default observer(function WeekCalendar({ store }) {
  return (
    <div>
      <div className="weekcal__bar">
        <button onClick={() => store.prevWeek()}>&larr; Prev</button>
        <h3 className="weekcal__range">
          {format(store.weekStart, "MMM d")} –{" "}
          {format(addDays(store.weekStart, 6), "MMM d")}
        </h3>
        <button onClick={() => store.nextWeek()}>Next &rarr;</button>
      </div>

      {store.loading && <div>Loading slots…</div>}
      {store.error && <div className="weekcal__error">{store.error}</div>}

      {!store.loading && !store.error && (
        <div className="weekcal__grid">
          {store.calendar.map((day, i) => {
            const isActiveDate =
              store.selected.date?.toDateString() === day.date.toDateString();
            return (
              <div key={i} className="weekcal__day">
                <div className="weekcal__daytitle">
                  {DOW_NAMES[day.date.getDay()]}{" "}
                  <span className="weekcal__date">
                    {format(day.date, "MMM d")}
                  </span>
                </div>

                <div className="weekcal__slots">
                  {day.slots.length === 0 && (
                    <div className="weekcal__closed">Closed</div>
                  )}
                  {day.slots.map((s) => {
                    const active =
                      isActiveDate && store.selected.time === s.time;
                    return (
                      <button
                        key={s.time}
                        disabled={!s.available}
                        onClick={() => store.selectSlot(day.date, s.time)}
                        className={[
                          "weekcal__slot",
                          active && "weekcal__slot--active",
                          !s.available && "weekcal__slot--disabled",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {s.time}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
