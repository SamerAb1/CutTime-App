// src/pages/Auth.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase-client";
import "./Auth.css";

export default function Auth() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [logo, setLogo] = useState("/images/logo-viking.png"); // in /public/images/

  // Prevent scroll while this page is visible (desktop)
  useEffect(() => {
    document.body.classList.add("auth-no-scroll");
    return () => document.body.classList.remove("auth-no-scroll");
  }, []);

  // If signed in already → go to admin
  useEffect(() => {
    let unsub;

    // 1) Immediate check
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) navigate("/admin", { replace: true });
    });

    // 2) React to future sign-ins
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/admin", { replace: true });
    });
    unsub = sub?.subscription;

    return () => unsub?.unsubscribe?.();
  }, [navigate]);

  const handleLogoError = () => {
    if (logo !== "/images/logo.png") setLogo("/images/logo.png");
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pw,
    });

    setLoading(false);

    if (error) {
      setErr(error.message || "Sign in failed.");
      return;
    }

    // Navigation also handled by onAuthStateChange, but this is instant:
    navigate("/admin", { replace: true });
  }

  return (
    <main className="auth-screen">
      <div className="auth-overlay" />

      <section className="auth-card">
        {/* Brand */}
        <img
          className="auth-logo"
          src={logo}
          alt="CutTime Barbers"
          onError={handleLogoError}
        />
        <h1 className="auth-title">Barber Login</h1>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="barber@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* same style as booking inputs, no eye toggle */}
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            minLength={6}
          />

          {err && <div className="auth-error">{err}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !email || !pw}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="auth-hint">Guests don’t need an account to book.</p>
        </form>
      </section>
    </main>
  );
}
