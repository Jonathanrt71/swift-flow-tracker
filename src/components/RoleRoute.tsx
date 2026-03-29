import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Navigate } from "react-router-dom";

/**
 * Route guard that checks the role_permissions table.
 * Pass a permission key like "events.view" — user must have at least 'view' access.
 * Admin always passes (handled inside usePermissions).
 * Falls back to legacy role-based check if permissionKey is not provided.
 */
const RoleRoute = ({
  children,
  allowed,
  permissionKey,
}: {
  children: React.ReactNode;
  allowed?: string[];
  permissionKey?: string;
}) => {
  const { session, loading } = useAuth();
  const { has, isLoading } = usePermissions();

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Check permission from database
  if (permissionKey && !has(permissionKey, "view")) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;
