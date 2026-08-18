import React, { useCallback, useState } from "react";
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  OnConnect,
} from "reactflow";
import "reactflow/dist/style.css";
import api from "../services/api";

const initialNodes: Node[] = [
  { id: "1", position: { x: 250, y: 5 }, data: { label: "Trigger" }, type: "input" },
  { id: "2", position: { x: 250, y: 100 }, data: { label: "Action" }, type: "default" },
];

const initialEdges: Edge[] = [{ id: "e1-2", source: "1", target: "2", animated: true }];

export default function Editor() {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback((changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect: OnConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), []);

  const addNode = useCallback(() => {
    const id = String(Date.now());
    setNodes((nds) => nds.concat({ id, position: { x: 200, y: 200 }, data: { label: `Node ${id}` } }));
  }, []);

  const saveWorkflow = useCallback(async () => {
    const payload = {
      name: `Workflow ${Date.now()}`,
      prompt: "Saved from visual editor",
      payload: JSON.stringify({ nodes, edges }),
    };
    try {
      await api.post("/workflows", payload);
      alert("Saved");
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  }, [nodes, edges]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Workflow Editor</h1>
        <div>
          <button onClick={addNode} className="btn-primary mr-2">Add Node</button>
          <button onClick={saveWorkflow} className="btn-primary">Save</button>
        </div>
      </div>
      <div style={{ height: 600 }} className="bg-white rounded shadow">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
