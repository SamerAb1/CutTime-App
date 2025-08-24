import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../supabase-client";

export default function RequireBarber({ children }) {
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      // 1) Wait for session hydration on page load/refresh
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session) {
        setAllowed(false);
        setChecking(false);
        return;
      }

      // 2) (Optional) Confirm this user is a barber
      // If you don't need a role check, just setAllowed(true) here.
      const { data: u, error } = await supabase
        .from("users")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      setAllowed(!error && u?.role === "barber");
      setChecking(false);
    })();

    // 3) Also react to subsequent auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setAllowed(!!s); // logged in = allowed (role already validated above)
      setChecking(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  // While checking, render nothing to avoid premature redirect on refresh
  if (checking) return null;

  // Not allowed → send to Auth
  if (!allowed) return <Navigate to="/auth" replace />;

  // Allowed → render the protected content
  return children;
}
