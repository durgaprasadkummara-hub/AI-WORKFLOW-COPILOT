import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Workflows from "./pages/Workflows";
import WorkflowEditor from "./pages/WorkflowEditor";
import Nodes from "./pages/Nodes";
import Conversations from "./pages/Conversations";
import { AuthProvider } from "./auth/AuthProvider";
import AuthCallback from "./auth/AuthCallback";
import SignoutCallback from "./auth/SignoutCallback";
import ProtectedRoute from "./components/ProtectedRoute";
import Editor from "./pages/Editor";

const Admin = () => <div className="max-w-6xl mx-auto">Admin area (RBAC)</div>;

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Navbar />
        <main className="p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/workflows/:id" element={<WorkflowEditor />} />
            <Route path="/nodes" element={<Nodes />} />
            <Route path="/conversations" element={<Conversations />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/signout-callback" element={<SignoutCallback />} />
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><Admin /></ProtectedRoute>} />
            <Route path="/editor" element={<ProtectedRoute roles={["editor","admin"]}><Editor /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
