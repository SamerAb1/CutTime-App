import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase-client";
import "./Login.css";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      // 1) Supabase sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw,
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error("Sign-in failed.");

      // 2) Ensure this user is a barber (RBAC)
      const { data: barberRow, error: barberErr } = await supabase
        .from("users")
        .select("user_id, role")
        .eq("user_id", userId)
        .eq("role", "barber")
        .single();

      if (barberErr || !barberRow) {
        // not a barber → sign out and show message
        await supabase.auth.signOut();
        throw new Error("This account doesn’t have barber access.");
      }

      // 3) Success → go to dashboard (change if your route differs)
      nav("/dashboard");
    } catch (e) {
      setErr(e.message || "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Barber Login</h1>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <label className="field">
            <span className="field-label">Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="barber@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <div className="password-wrap">
              <input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                className="input"
                minLength={6}
              />
              <button
                type="button"
                className="eye"
                aria-label={showPw ? "Hide password" : "Show password"}
                onClick={() => setShowPw((s) => !s)}
              >
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

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
      </div>
    </div>
  );
}
