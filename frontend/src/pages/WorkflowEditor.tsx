import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

export default function WorkflowEditor() {
  const { id } = useParams();
  const [workflow, setWorkflow] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    api.get(`/workflows/${id}`).then(res => setWorkflow(res.data.workflow ?? res.data)).catch(() => {});
  }, [id]);

  if (!id) return <div>New workflow editor (not implemented)</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Workflow Editor</h1>
      {!workflow ? (
        <p>Loading workflow...</p>
      ) : (
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-xl font-semibold">{workflow.name}</h2>
          <pre className="mt-2 text-sm overflow-auto max-h-96 bg-slate-50 p-2">{workflow.payload ?? JSON.stringify(workflow, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
