import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function Nodes() {
  const [nodes, setNodes] = useState<any[]>([]);

  useEffect(() => {
    api.get("/nodes").then(res => setNodes(res.data.nodes ?? res.data)).catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Node Catalog</h1>
      <div className="grid grid-cols-3 gap-4">
        {nodes.map(n => (
          <div key={n.id} className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold">{n.name}</h3>
            <p className="text-sm text-slate-600">{n.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
