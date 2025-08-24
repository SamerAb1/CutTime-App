import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { authStore } from "../stores/authStore";
import "./Navbar.css";

export default observer(function Navbar() {
  const { isLoggedIn, isBarber } = authStore;
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <nav className="navbar" style={{ paddingTop: "var(--safe-top)" }}>
      <div className="navbar__wrap">
        <Link to="/" className="navbar__brand" onClick={close}>
          <img
            src="/images/logo-viking.svg"
            alt="CutTime logo"
            className="navbar__logo"
            onError={(e) => {
              e.currentTarget.src = "/images/logo-viking.png";
            }}
          />
          <span className="navbar__title">CutTime Barbers</span>
        </Link>

        {/* desktop links */}
        <div className="navbar__links">
          {isBarber && (
            <NavLink
              to="/admin"
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              Admin
            </NavLink>
          )}
          {!isLoggedIn ? (
            <NavLink to="/auth" className="btn btn--primary navbar__login">
              Login
            </NavLink>
          ) : (
            <button
              className="btn navbar__login"
              onClick={() => {
                authStore.signOut();
                close();
              }}
            >
              Logout
            </button>
          )}
        </div>

        {/* hamburger (shown on mobile) */}
        <button
          className="navbar__burger"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* mobile sheet */}
      <div className={`navbar__mobile ${open ? "is-open" : ""}`}>
        {isBarber && (
          <NavLink to="/admin" onClick={close}>
            Admin
          </NavLink>
        )}
        {!isLoggedIn ? (
          <NavLink to="/auth" className="btn btn--primary" onClick={close}>
            Login
          </NavLink>
        ) : (
          <button
            className="btn"
            onClick={() => {
              authStore.signOut();
              close();
            }}
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
});
