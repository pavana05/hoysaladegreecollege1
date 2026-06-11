import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function DashboardRedirect() {
  const { user, role, loading } = useAuth();

  // Wait while auth resolves, OR while we have a session but no role yet.
  // This prevents routing on a stale role from a previous session after a
  // token refresh (e.g. mobile data toggled off/on).
  if (loading || (user && !role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  switch (role) {
    case "student":
      return <Navigate to="/dashboard/student" replace />;
    case "teacher":
      return <Navigate to="/dashboard/teacher" replace />;
    case "principal":
      return <Navigate to="/dashboard/principal" replace />;
    case "admin":
      return <Navigate to="/dashboard/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}
