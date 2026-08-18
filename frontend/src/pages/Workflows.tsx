import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

type Workflow = { id: string; name: string; status: string; createdAt: string };

export default function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/workflows").then((res) => {
      setWorkflows(res.data.workflows ?? res.data ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold mb-4">Workflows</h1>
        <Link to="/workflows/new" className="btn-primary">New</Link>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white shadow rounded p-4">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map(w => (
                <tr key={w.id} className="border-t">
                  <td><Link to={`/workflows/${w.id}`} className="text-blue-600">{w.name}</Link></td>
                  <td>{w.status}</td>
                  <td>{new Date(w.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
