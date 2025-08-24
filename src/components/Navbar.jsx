import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../supabase-client";
import "./Navbar.css";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState(null);
  const navigate = useNavigate();

  // Track auth session
  useEffect(() => {
    let ignore = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!ignore) setSession(data.session ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s ?? null);
    });

    return () => {
      ignore = true;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // Lock scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => (document.body.style.overflow = "");
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const onLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("signOut error:", error);
    } finally {
      // use router navigation, avoids full reload
      navigate("/", { replace: true });
    }
  };

  return (
    <header className="site-header">
      <nav className="nav">
        {/* Brand */}
        <Link className="nav__brand" to="/" aria-label="CutTime Barbers">
          <img
            src="/images/logo-viking.png"
            alt=""
            onError={(e) => (e.currentTarget.src = "/images/logo.png")}
          />
          <span className="nav__brandText">Blades of the North</span>
        </Link>

        {/* Desktop links */}
        <ul className="nav__links">
          <li>
            <NavLink to="/book">Book a Chair</NavLink>
          </li>
        </ul>

        {/* Desktop actions */}
        <div className="nav__actions">
          {session ? (
            <>
              <NavLink className="btn-link" to="/admin">
                Admin
              </NavLink>
              <button className="btn-pill" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <NavLink className="btn-pill" to="/auth">
              Login
            </NavLink>
          )}
        </div>

        {/* Burger (mobile) */}
        <button
          className={`nav__burger ${menuOpen ? "is-active" : ""}`}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>

        {/* Overlay */}
        <button
          className={`nav__overlay ${menuOpen ? "is-open" : ""}`}
          aria-hidden="true"
          onClick={closeMenu}
        />

        {/* Drawer */}
        <div
          id="mobile-menu"
          className={`nav__drawer ${menuOpen ? "is-open" : ""}`}
          role="dialog"
          aria-modal="true"
        >
          <ul className="nav__drawerList">
            <li>
              <NavLink to="/" onClick={closeMenu}>
                Home
              </NavLink>
            </li>
            <li>
              <NavLink to="/book" onClick={closeMenu}>
                Book a Chair
              </NavLink>
            </li>
            {session ? (
              <>
                <li>
                  <NavLink to="/admin" onClick={closeMenu}>
                    Admin
                  </NavLink>
                </li>
                <li>
                  <button
                    className="btn-pill btn-pill--full"
                    onClick={() => {
                      closeMenu();
                      onLogout();
                    }}
                  >
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <li>
                <NavLink
                  className="btn-pill btn-pill--full"
                  to="/auth"
                  onClick={closeMenu}
                >
                  Login
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </nav>
    </header>
  );
}
