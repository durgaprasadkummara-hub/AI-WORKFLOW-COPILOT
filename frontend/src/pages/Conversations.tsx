import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function Conversations() {
  const [convs, setConvs] = useState<any[]>([]);

  useEffect(() => {
    api.get("/conversations").then(res => setConvs(res.data.conversations ?? res.data)).catch(() => {});
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Conversations</h1>
      <div className="space-y-3">
        {convs.map(c => (
          <div key={c.id} className="bg-white p-4 rounded shadow">
            <div className="flex justify-between">
              <div>Conversation {c.id}</div>
              <div className="text-sm text-slate-500">{new Date(c.createdAt).toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
