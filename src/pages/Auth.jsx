import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase-client";
import "./Auth.css";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [logo, setLogo] = useState("/images/logo-viking.png"); // try themed logo first
  const navigate = useNavigate();

  // Fallback logo if the first one is missing
  const onLogoError = () => {
    if (logo !== "/images/logo.png") setLogo("/images/logo.png");
  };

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });
    if (error) {
      setErr(error.message);
    } else {
      // go straight to admin dashboard
      navigate("/admin");
    }
    setLoading(false);
  }

  // Optional: focus email on mount
  useEffect(() => {
    const el = document.querySelector(".auth-card input[type='email']");
    el?.focus();
  }, []);

  return (
    <main className="auth-screen">
      <div className="auth-overlay" />

      <section className="auth-card">
        <img
          className="auth-logo"
          src={logo}
          alt="CutTime Barbers"
          onError={onLogoError}
        />
        <h1 className="auth-title">Barber Login</h1>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
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
