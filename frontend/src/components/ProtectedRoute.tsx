import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;

  if (roles && roles.length > 0) {
    const claims = (user?.profile as any) || {};
    const userRoles = claims.roles || claims.role || [];
    const roleList = Array.isArray(userRoles) ? userRoles : [userRoles];
    const allowed = roles.some(r => roleList.includes(r));
    if (!allowed) return <div className="max-w-6xl mx-auto p-6">Access denied</div>;
  }

  return <>{children}</>;
}
