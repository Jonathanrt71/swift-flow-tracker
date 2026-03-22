import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";

type AllowedRole = "admin" | "faculty" | "resident";

const RoleRoute = ({
  children,
  allowed,
}: {
  children: React.ReactNode;
  allowed: AllowedRole[];
}) => {
  const { session, loading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    // Preserve hash for recovery/invite tokens so they reach /reset-password
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("type=invite")) {
      return <Navigate to={`/reset-password${hash}`} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (!allowed.includes(role as AllowedRole)) {
    // Residents land on events page
    if (role === "resident") {
      return <Navigate to="/events" replace />;
    }
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;
