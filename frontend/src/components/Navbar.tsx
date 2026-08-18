import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export default function Navbar() {
  const { user, signin, signout } = useAuth();
  const roles: string[] = (user?.profile?.roles as any) || (user?.profile?.role as any) || [];

  const isAdmin = Array.isArray(roles) ? roles.includes("admin") : roles === "admin";

  return (
    <header className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg">AI Workflow Copilot</Link>
        <nav className="space-x-4 items-center flex">
          <Link to="/workflows" className="text-slate-600 hover:text-slate-900">Workflows</Link>
          <Link to="/nodes" className="text-slate-600 hover:text-slate-900">Nodes</Link>
          <Link to="/conversations" className="text-slate-600 hover:text-slate-900">Conversations</Link>
          <Link to="/editor" className="text-slate-600 hover:text-slate-900">Editor</Link>
          {isAdmin && <Link to="/admin" className="text-slate-600 hover:text-slate-900">Admin</Link>}
          {user ? (
            <>
              <span className="ml-4 text-slate-600">{user.profile?.name ?? user.profile?.email}</span>
              <button onClick={() => signout()} className="ml-4 btn-primary">Logout</button>
            </>
          ) : (
            <button onClick={() => signin()} className="ml-4 btn-primary">Login</button>
          )}
        </nav>
      </div>
    </header>
  );
}
