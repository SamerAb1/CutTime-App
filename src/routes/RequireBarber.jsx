import { observer } from "mobx-react-lite";
import { Navigate, useLocation } from "react-router-dom";
import { authStore } from "../stores/authStore";

export default observer(function RequireBarber({ children }) {
  const loc = useLocation();
  if (authStore.loading) return <div>Loading…</div>;
  if (!authStore.isLoggedIn)
    return <Navigate to="/auth" state={{ from: loc }} replace />;
  if (!authStore.isBarber)
    return <Navigate to="/" replace state={{ from: loc }} />;
  return children;
});
